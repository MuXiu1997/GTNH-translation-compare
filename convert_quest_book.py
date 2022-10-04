# Convert quest book to paratranz json
import argparse
import os

from internal.langfiletype import LangFiletype
from utils import ensure_lf
from utils.paratranz import to_json

LANG_REL_PATH = "resources/minecraft/lang/zh_CN.lang"
LANG_US_REL_PATH = "resources/minecraft/lang/en_US.lang"


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-path", dest="repo_path", type=str, required=False)
    parser.add_argument("--output-path", dest="output_path", type=str, required=True)
    return parser.parse_args()


if __name__ == '__main__':
    args = parse_args()

    with open(os.path.join(args.repo_path, LANG_US_REL_PATH)) as fp:
        lang_en = LangFiletype(LANG_US_REL_PATH, ensure_lf(fp.read()))

    with open(os.path.join(args.repo_path, LANG_REL_PATH)) as fp:
        lang_zh = LangFiletype(LANG_REL_PATH, ensure_lf(fp.read()))

    to_json(lang_en.get_precise_properties(), os.path.join(args.output_path, "quest.json"),
            lang_zh.get_precise_properties())
