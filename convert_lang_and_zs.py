# Convert lang and zs file in mod pack to paratranz json file
import argparse
from os import path
from pathlib import Path

from internal.modpack import ModPack
from internal.translationpack import TranslationPack
from utils.paratranz import to_json


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mod-pack-path", dest="mod_pack_path", type=str, required=True)
    parser.add_argument("--translated-pack-path", dest="translated_pack_path", type=str, required=True)
    parser.add_argument("--output-path", dest="output_path", type=str, required=True)
    return parser.parse_args()


if __name__ == '__main__':
    args = parse_args()
    mod_pack = ModPack(Path(args.mod_pack_path))
    translated_pack = TranslationPack(Path(args.translated_pack_path))

    translated_lang_files = dict(
        zip([f.relpath for f in translated_pack.lang_files], translated_pack.lang_files))

    res_dir = path.join(args.output_path, "resources")
    for lang_file in mod_pack.lang_files:
        translated_lang_file = translated_lang_files.get(
            lang_file.relpath.replace("en_US", "zh_CN"), None)
        to_json(lang_file.get_precise_properties(), path.join(res_dir, path.dirname(path.dirname(lang_file.relpath))) +
                ".json", translated_lang_file.get_precise_properties() if translated_lang_file is not None else {})

    translated_script_files = dict(
        zip([f.relpath for f in translated_pack.script_files], translated_pack.script_files))

    script_dir = path.join(args.output_path, "scripts")
    for script_file in mod_pack.script_files:
        translated_script_file = translated_script_files.get(
            script_file.relpath, None)
        to_json(script_file.properties, path.join(script_dir, script_file.relpath + ".json"),
                translated_script_file.properties if translated_script_file is not None else {}, True)
