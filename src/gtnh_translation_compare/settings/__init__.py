import os

from gtnh_translation_compare.filetypes import Language
from gtnh_translation_compare.utils.env import must_get_env

TARGET_LANG = Language.from_str(os.environ.get("TARGET_LANG", "pt_BR"))

GTNH_REPO = os.environ.get("GTNH_REPO", "GTNewHorizons/GT-New-Horizons-Modpack")
DEFAULT_QUESTS_LANG_TEMPLATE_REL_PATH = os.environ.get(
    "DEFAULT_QUESTS_LANG_TEMPLATE_REL_PATH",
    "config/txloader/load/betterquesting/lang/template.lang",
)
DEFAULT_QUESTS_LANG_EN_US_REL_PATH = os.environ.get(
    "DEFAULT_QUESTS_LANG_EN_US_REL_PATH",
    "config/txloader/load/betterquesting/lang/en_US.lang",
)
DEFAULT_QUESTS_LANG_TARGET_REL_PATH = os.environ.get(
    "DEFAULT_QUESTS_LANG_TARGET_REL_PATH",
    f"config/txloader/load/betterquesting/lang/{TARGET_LANG.value}.lang",
)
GT_LANG_EN_US_REL_PATH = "GregTech_US.lang"
GT_LANG_TARGET_REL_PATH = "GregTech.lang"

PARATRANZ_PROJECT_ID = int(must_get_env("PARATRANZ_PROJECT_ID"))
PARATRANZ_TOKEN = must_get_env("PARATRANZ_TOKEN")

GIT_AUTHOR = os.environ.get("GIT_AUTHOR", None)
CLOSE_ISSUE_IN_COMMIT_MESSAGE = os.environ.get("CLOSE_ISSUE_IN_COMMIT_MESSAGE", "true").lower() == "true"

PARATRANZ_CACHE_DIR = os.environ.get("PARATRANZ_CACHE_DIR", ".paratranz_cache")

__all__ = [
    "TARGET_LANG",
    "GTNH_REPO",
    "DEFAULT_QUESTS_LANG_TEMPLATE_REL_PATH",
    "DEFAULT_QUESTS_LANG_TARGET_REL_PATH",
    "GT_LANG_EN_US_REL_PATH",
    "GT_LANG_TARGET_REL_PATH",
    "PARATRANZ_PROJECT_ID",
    "PARATRANZ_TOKEN",
    "GIT_AUTHOR",
    "CLOSE_ISSUE_IN_COMMIT_MESSAGE",
]
