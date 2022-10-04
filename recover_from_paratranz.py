# Download translated file from paratranz, and convert back to corresponding format
import argparse
import json
import os
from pathlib import Path
from os import path
import subprocess
import tempfile
from internal.modpack import ModPack

from utils import paratranz


# proxies = {
#     'http': 'http://172.28.224.1:10811',
#     'https': 'http://172.28.224.1:10811',
# }


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mod-pack-path",
                        dest="mod_pack_path", type=str, required=True)
    parser.add_argument("--output-path", dest="output_path",
                        type=str, required=True)
    return parser.parse_args()


def translated_content(en_content: str,
                       translated_items: list[paratranz.ParatranzItem],
                       re_encode: bool = False) -> str:
    content = ""
    last_end = 0
    for item in translated_items:
        start = int(item["context"].split(":")[0])
        if "translation" in item and item["translation"] != "":
            value = item["translation"]
        else:
            value = item["original"]
        if re_encode:
            value = value.encode("unicode_escape").decode('ascii')

        content += en_content[last_end:start] + value
        last_end = int(item["context"].split(":")[1])
    content += en_content[last_end:]
    return content


if __name__ == "__main__":
    token = os.getenv("PARATRANZ_TOKEN", None)
    assert token is not None, "Can not find env: `PARATRANZ_TOKEN`"

    args = parse_args()

    paratranz.set_token(token)
    # paratranz.set_proxies(proxies)
    paratranz.trigger_export()

    with tempfile.TemporaryDirectory() as tmp_dir:
        paratranz.download(path.join(tmp_dir, "paratranz.zip"))
        subprocess.run(
            [
                "unzip",
                "paratranz.zip",
            ],
            cwd=tmp_dir
        )
        mod_pack = ModPack(Path(args.mod_pack_path))

        lang_files = dict(
            zip([path.dirname(path.dirname(f.relpath)) for f in mod_pack.lang_files], mod_pack.lang_files))

        resource_path = Path(path.join(tmp_dir, "utf8/resources/"))
        translated_resource_path = Path(path.join(args.output_path, "resources"))

        for resource in os.listdir(resource_path):
            resource: str
            resource_name = resource[:-5]
            lang_file = lang_files.get(resource_name, None)

            if lang_file is not None:
                with open(resource_path / resource, "r") as fp:
                    items: list[paratranz.ParatranzItem] = json.load(fp)

                new_content = translated_content(lang_file.content, items)

                target_dir = translated_resource_path / resource_name / "lang"
                os.makedirs(target_dir, exist_ok=True)
                with open(target_dir / "zh_CN.lang", "w") as fp:
                    fp.write(new_content)
            else:
                print("not found", resource_name)

        script_files = dict(zip([path.basename(f.relpath) for f in mod_pack.script_files], mod_pack.script_files))

        script_path = Path(path.join(tmp_dir, "utf8/scripts/"))
        translated_script_path = Path(path.join(args.output_path, "scripts"))

        for script in os.listdir(script_path):
            script: str
            script_name = script[:-5]
            script_file = script_files.get(script_name, None)
            if script_file is not None:
                with open(script_path / script, "r") as fp:
                    items: list[paratranz.ParatranzItem] = json.load(fp)

                new_content = translated_content(script_file.content, items, True)

                target_dir = translated_script_path
                os.makedirs(target_dir, exist_ok=True)
                with open(target_dir / script_name, "w") as fp:
                    fp.write(new_content)
            else:
                print("not found", script_name)

        quest_en = Path(args.mod_pack_path) / "resources" / "minecraft" / "lang" / "en_US.lang"
        quest_zh = translated_resource_path / "minecraft" / "lang" / "zh_CN.lang"
        with open(path.join(tmp_dir, "utf8/quest.json"), "r") as fp:
            items: list[paratranz.ParatranzItem] = json.load(fp)
        with open(quest_en, "r") as fp:
            quest_en_content = fp.read()

        new_content = translated_content(quest_en_content, items)
        os.makedirs(path.dirname(quest_zh), exist_ok=True)
        with open(quest_zh, "w") as fp:
            fp.write(new_content)
