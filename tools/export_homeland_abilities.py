"""Exports every Aniimo form's Homeland abilities from the game files to data/aniimo_homeland.csv.

Usage (Python 3.8+, standard library only):

    python tools/export_homeland_abilities.py [GAME_DIR] [--out data/aniimo_homeland.csv]

GAME_DIR defaults to D:/SteamLibrary/steamapps/common/Aniimo. The game directory is only ever
opened for reading; everything is decoded in memory and the one output file is written into
this repository.

Where the data lives: Aniimo_Data/StreamingAssets/cvs/res/lua/ (the installed game) and
Aniimo_Data/cvs/res/lua/ (a hot update) each hold a LuaScripts.xdt, a JSON index into
LuaScripts.xdf; the one with the higher CMVersion is current. Entry Common/Data/pmdata.bin there is the game's config database (the "BDD"
format xlua.dll loads), and Data/I18N/NewTextMap_<lang>.json + Compress_<lang>.bin hold the text.
Tables read: pet_data (homeAbility, formId, name, ethnicGroup), home_ability_data (ability ids),
pet_form_type_data (form names), pet_research_id_to_number (the species No.) and
pet_research_species_country_set (the region whose handbook numbers it: each region's handbook
starts again from 1).

BDD layout, as far as this script needs it (all integers little-endian, all addresses are byte
offsets into pmdata.bin):
  - The last u32 of the file is the root table (table name -> table).
  - A table is a record: u32 descriptor address, then its values.
  - A descriptor is three u32 addresses: shape, types, offsets.
  - A shape is u32 array_count, u8 key_width_code, u32 key_count, u32 numeric_key_count,
    then the numeric keys (each key_width_code wide), then u32 string addresses for the rest.
  - The types node has one byte per key: 0 double, 1 u8, 2 i8, 3 i16, 4 u16, 5 i32, 6 u32,
    7 string address, 8 table address, 9 bool. 100 + type means the value is a constant shared
    by every record with this descriptor.
  - The offsets node is a width code byte then one offset per key. A plain value sits at
    record + offset; a constant sits at (address of its offset entry) - offset.
  - Strings are NUL-terminated UTF-8.
"""

import argparse
import csv
import json
import os
import struct
import sys
import zlib

DEFAULT_GAME_DIR = "D:/SteamLibrary/steamapps/common/Aniimo"
DEFAULT_OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "aniimo_homeland.csv")

# home_ability_data id -> column name, in the order the columns are written.
ABILITIES = [
    (1000, "Fire"), (1001, "Grass"), (1002, "Water"), (1003, "Earth"), (1004, "Lightning"),
    (1005, "Ice"), (1006, "Wind"), (1007, "Dark"), (1008, "Light"),
    (1100, "Hauling"), (1101, "Artisanship"), (1102, "Leisure"), (1103, "Perfumery"),
]

WIDTHS = {1: 1, 2: 1, 3: 2, 4: 2, 5: 4, 6: 4}

# pet_research_species_country_set's list of Aniimo outside any region's handbook.
OUTSIDE_REGIONS = 1000


# Where LuaScripts.xdt/.xdf can be, under the game directory: the installed game's copy and a
# hot update's. The game runs whichever is newer.
LUA_DIRS = [
    os.path.join("Aniimo_Data", "StreamingAssets", "cvs", "res", "lua"),
    os.path.join("Aniimo_Data", "cvs", "res", "lua"),
]


def lua_dir(game_dir):
    """The directory of the newest LuaScripts.xdt under `game_dir` (highest CMVersion)."""
    best = None
    for rel in LUA_DIRS:
        path = os.path.join(game_dir, rel, "LuaScripts.xdt")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                version = json.load(f)["CMVersion"]
            if best is None or version > best[0]:
                best = (version, os.path.join(game_dir, rel))
    if best is None:
        sys.exit(f"no LuaScripts.xdt under {game_dir}")
    return best[1]


def read_archive(game_dir, names):
    """Returns {entry name: bytes} for the wanted entries of LuaScripts.xdf."""
    base = lua_dir(game_dir)
    with open(os.path.join(base, "LuaScripts.xdt"), "r", encoding="utf-8") as f:
        index = json.load(f)
    found = {}
    with open(os.path.join(base, "LuaScripts.xdf"), "rb") as f:
        for e in index["CMList"]:
            short = e["CEName"].split("xfs/luascripts/", 1)[-1]
            if short not in names:
                continue
            f.seek(e["CEOffset"])
            data = f.read(e["CECSize"])
            if e["CECSize"] != e["CESize"]:
                data = zlib.decompress(data, -15)
            found[short] = data
    missing = set(names) - set(found)
    if missing:
        sys.exit(f"missing from LuaScripts.xdf: {sorted(missing)}")
    return found


class Bdd:
    def __init__(self, blob):
        self.b = blob

    def u32(self, p):
        return struct.unpack_from("<I", self.b, p)[0]

    def string(self, p):
        return self.b[p:self.b.index(b"\0", p)].decode("utf-8")

    def keys(self, shape):
        b = self.b
        width_code, n, numeric = b[shape + 4], self.u32(shape + 5), self.u32(shape + 9)
        w, p, out = WIDTHS[width_code], shape + 13, []
        for _ in range(numeric):
            out.append(int.from_bytes(b[p:p + w], "little"))
            p += w
        for _ in range(n - numeric):
            out.append(self.string(self.u32(p)))
            p += 4
        return out

    def value(self, t, p):
        if t == 0:
            return struct.unpack_from("<d", self.b, p)[0]
        if t == 7:
            return self.string(self.u32(p))
        if t == 8:
            return ("table", self.u32(p))
        if t == 9:
            return bool(self.b[p])
        fmt = {1: "<B", 2: "<b", 3: "<h", 4: "<H", 5: "<i", 6: "<I"}.get(t)
        if fmt is None:
            raise ValueError(f"unknown value type {t} at {p}")
        return struct.unpack_from(fmt, self.b, p)[0]

    def table(self, record, depth=99):
        """Decodes a record into a dict, following nested tables up to `depth` levels."""
        d = self.u32(record)
        shape, types, offsets = self.u32(d), self.u32(d + 4), self.u32(d + 8)
        keys = self.keys(shape)
        w = WIDTHS[self.b[offsets]]
        out = {}
        for i, k in enumerate(keys):
            entry = offsets + 1 + w * i
            off = int.from_bytes(self.b[entry:entry + w], "little")
            t = self.b[types + i]
            v = self.value(t - 100, entry - off) if t >= 100 else self.value(t, record + off)
            if isinstance(v, tuple):
                v = self.table(v[1], depth - 1) if depth > 0 else v[1]
            out[k] = v
        return out

    def root_table(self, name, depth=99):
        root = self.table(self.u32(len(self.b) - 4), depth=0)
        return self.table(root[name], depth)


class Text:
    def __init__(self, files, lang):
        self.index = json.loads(files[f"Data/I18N/NewTextMap_{lang}.json"])
        self.blob = files[f"Data/I18N/Compress_{lang}.bin"]

    def __call__(self, h):
        e = self.index.get(str(h))
        return self.blob[e[0]:e[0] + e[1]].decode("utf-8") if e else ""


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    ap.add_argument("game_dir", nargs="?", default=DEFAULT_GAME_DIR)
    ap.add_argument("--out", default=DEFAULT_OUT)
    args = ap.parse_args()

    if os.path.abspath(args.out).startswith(os.path.abspath(args.game_dir)):
        sys.exit("refusing to write inside the game directory")

    files = read_archive(args.game_dir, {
        "Common/Data/pmdata.bin",
        "Data/I18N/NewTextMap_en.json", "Data/I18N/Compress_en.bin",
        "Data/I18N/NewTextMap_zh_TW.json", "Data/I18N/Compress_zh_TW.bin",
    })
    db = Bdd(files["Common/Data/pmdata.bin"])
    en, zh = Text(files, "en"), Text(files, "zh_TW")

    known = {k for k, _ in ABILITIES}
    names = db.root_table("home_ability_data")
    unknown = set(names) - known
    if unknown:
        sys.exit(f"home_ability_data has abilities this script doesn't know: {sorted(unknown)}")
    for aid, col in ABILITIES:
        if en(names[aid]["name"]) != col:
            sys.exit(f"ability {aid} is now {en(names[aid]['name'])!r}, expected {col!r}")

    forms = db.root_table("pet_form_type_data")
    numbers = db.root_table("pet_research_id_to_number")
    countries = db.root_table("pet_research_species_country_set")
    pets = db.root_table("pet_data", depth=0)

    def region_of(pet_id, pet):
        """The region whose handbook numbers this species (300001, 300301, ...), else 1000 for
        the list of Aniimo outside any region (numbered from 10001), else 0."""
        regions = sorted(countries.get(pet.get("baseFormPet", pet_id)) or {})
        return next((r for r in regions if r != OUTSIDE_REGIONS), regions[0] if regions else 0)

    rows = []
    for pet_id, record in pets.items():
        number = numbers.get(pet_id)
        if number is None:  # NPC, boss, test and robot entries have no handbook number
            continue
        pet = db.table(record, depth=1)
        abilities = pet.get("homeAbility") or {}
        if not abilities:
            continue
        form_id = pet.get("formId", 1)
        form_name = forms[form_id]["name"]
        rows.append([number, pet_id, form_id, en(pet["name"]), zh(pet["name"]), en(form_name), zh(form_name),
                     region_of(pet_id, pet), pet.get("ethnicGroup", pet_id // 1000)]
                    + [abilities.get(aid, 0) for aid, _ in ABILITIES])
    rows.sort(key=lambda r: (r[7] == 0, r[7] == OUTSIDE_REGIONS, r[7], r[0], r[1]))

    with open(args.out, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["number", "pet_id", "form_id", "name", "name_zh_tw", "form", "form_zh_tw", "region", "family"]
                   + [col for _, col in ABILITIES])
        w.writerows(rows)
    print(f"wrote {len(rows)} forms of {len({(r[7], r[0]) for r in rows})} species to {os.path.normpath(args.out)}")


if __name__ == "__main__":
    main()
