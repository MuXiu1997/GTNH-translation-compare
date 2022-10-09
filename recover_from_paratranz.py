# Download translated file from paratranz, and convert back to corresponding format
import argparse
import json
import os
from pathlib import Path
from os import path
import subprocess
import tempfile
from typing import Any
from internal.modpack import ModPack

from utils.paratranz import ParatranzAPI, translated_content, ParatranzItem


# proxies = {
#     'http': 'http://172.28.224.1:10811',
#     'https': 'http://172.28.224.1:10811',
# }


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mod-pack-path", dest="mod_pack_path", type=str, required=True)
    parser.add_argument("--translated-pack-path", dest="translated_pack_path", type=str, required=True)
    parser.add_argument("--output-path", dest="output_path", type=str, required=True)
    parser.add_argument("--temp-path", dest="temp_path", type=str, required=False)
    return parser.parse_args()


def process_in(args: Any, paratranz: ParatranzAPI, tmp_dir: str):
    paratranz.download(path.join(tmp_dir, "paratranz.zip"))
    subprocess.run(
        [
            "unzip",
            "paratranz.zip",
        ],
        cwd=tmp_dir,
        check=True,
    )
    mod_pack = ModPack(Path(args.mod_pack_path))

    lang_files = dict(zip([path.dirname(path.dirname(f.relpath)) for f in mod_pack.lang_files], mod_pack.lang_files))

    resource_path = Path(path.join(tmp_dir, "utf8/resources/"))
    translated_resource_path = Path(path.join(args.output_path, "resources"))

    for resource in os.listdir(resource_path):
        resource_name = resource[:-5]
        lang_file = lang_files.get(resource_name, None)

        if lang_file is not None:
            with open(resource_path / resource, "r", encoding="utf-8") as fp:
                items: list[ParatranzItem] = json.load(fp)

            new_content = translated_content(lang_file.content, items)

            target_dir = translated_resource_path / resource_name / "lang"
            os.makedirs(target_dir, exist_ok=True)
            with open(target_dir / "zh_CN.lang", "w", encoding="utf-8") as fp:
                fp.write(new_content)
        else:
            print("not found", resource_name)

    script_files = dict(zip([path.basename(f.relpath) for f in mod_pack.script_files], mod_pack.script_files))

    script_path = Path(path.join(tmp_dir, "utf8/scripts/"))
    translated_script_path = Path(path.join(args.output_path, "scripts"))

    for script in os.listdir(script_path):
        script_name = script[:-5]
        script_file = script_files.get(script_name, None)
        if script_file is not None:
            with open(script_path / script, "r", encoding="utf-8") as fp:
                items = json.load(fp)

            new_content = translated_content(script_file.content, items, True)

            target_dir = translated_script_path
            os.makedirs(target_dir, exist_ok=True)
            with open(target_dir / script_name, "w", encoding="utf-8") as fp:
                fp.write(new_content)
        else:
            print("not found", script_name)

    quest_en = Path(args.translated_pack_path) / "resources" / "minecraft" / "lang" / "en_US.lang"
    quest_zh = translated_resource_path / "minecraft" / "lang" / "zh_CN.lang"
    with open(path.join(tmp_dir, "utf8/quest.json"), "r", encoding="utf-8") as fp:
        items = json.load(fp)
    with open(quest_en, "r", encoding="utf-8") as fp:
        quest_en_content = fp.read()

    new_content = translated_content(quest_en_content, items)
    os.makedirs(path.dirname(quest_zh), exist_ok=True)
    with open(quest_zh, "w", encoding="utf-8") as fp:
        fp.write(new_content)


if __name__ == "__main__":
    token = os.getenv("PARATRANZ_TOKEN", None)
    assert token is not None, "Can not find env: `PARATRANZ_TOKEN`"

    parsed_args = parse_args()

    paratranz_api = ParatranzAPI(token)

    # paratranz.set_proxies(proxies)
    res = paratranz_api.trigger_export()
    print("trigger export", res.status_code, res.reason)

    if parsed_args.temp_path is not None:
        os.makedirs(parsed_args.temp_path, exist_ok=True)
        process_in(parsed_args, paratranz_api, parsed_args.temp_path)
    else:
        with tempfile.TemporaryDirectory() as directory:
            process_in(parsed_args, paratranz_api, directory)
