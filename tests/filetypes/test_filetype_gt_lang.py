from gtnh_translation_compare.filetypes import FiletypeGTLang, Language, Property
import pytest

EN_US_RELPATH = "GregTech_US.lang"
EN_US_CONTENT = "\n".join(
    [
        "# Configuration file",
        "",
        "enablelangfile {",
        "    B:UseThisFileAsLanguageFile=false",
        "}",
        "",
        "",
        "languagefile {",
        "    S:test=test",
        "}",
        "",
    ]
)
ZH_CN_RELPATH = "GregTech.lang"
ZH_CN_CONTENT = "\n".join(
    [
        "# Configuration file",
        "",
        "enablelangfile {",
        "    S:Language=en_US",
        "    B:UseThisFileAsLanguageFile=true",
        "}",
        "",
        "",
        "languagefile {",
        "    S:test=测试",
        "}",
        "",
    ]
)
JA_JP_RELPATH = "GregTech.lang"
JA_JP_CONTENT = "\n".join(
    [
        "# Configuration file",
        "",
        "enablelangfile {",
        "    S:Language=en_US",
        "    B:UseThisFileAsLanguageFile=true",
        "}",
        "",
        "",
        "languagefile {",
        "    S:test=テスト",
        "}",
        "",
    ]
)
PT_BR_RELPATH = "GregTech.lang"
PT_BR_CONTENT = "\n".join(
    [
        "# Configuration file",
        "",
        "enablelangfile {",
        "    S:Language=en_US",
        "    B:UseThisFileAsLanguageFile=true",
        "}",
        "",
        "",
        "languagefile {",
        "    S:test=teste",
        "}",
        "",
    ]
)

@pytest.fixture(scope="module")
def en_us_filetype_gt_lang() -> FiletypeGTLang:
    return FiletypeGTLang(EN_US_RELPATH, EN_US_CONTENT)


@pytest.fixture(scope="module")
def zh_cn_filetype_gt_lang() -> FiletypeGTLang:
    return FiletypeGTLang(ZH_CN_RELPATH, ZH_CN_CONTENT, Language.zh_CN)


@pytest.fixture(scope="module")
def ja_jp_filetype_gt_lang() -> FiletypeGTLang:
    return FiletypeGTLang(JA_JP_RELPATH, JA_JP_CONTENT, Language.ja_JP)

@pytest.fixture(scope="module")
def pt_br_filetype_gt_lang() -> FiletypeGTLang:
    return FiletypeGTLang(PT_BR_RELPATH, PT_BR_CONTENT, Language.pt_BR)


def test__get_relpath(
    en_us_filetype_gt_lang: FiletypeGTLang,
    zh_cn_filetype_gt_lang: FiletypeGTLang,
    ja_jp_filetype_gt_lang: FiletypeGTLang,
    pt_br_filetype_gt_lang: FiletypeGTLang,
) -> None:
    assert en_us_filetype_gt_lang.relpath == EN_US_RELPATH
    assert zh_cn_filetype_gt_lang.relpath == ZH_CN_RELPATH
    assert ja_jp_filetype_gt_lang.relpath == JA_JP_RELPATH
    assert pt_br_filetype_gt_lang.relpath == PT_BR_RELPATH


def test__get_content(
    en_us_filetype_gt_lang: FiletypeGTLang,
    zh_cn_filetype_gt_lang: FiletypeGTLang,
    ja_jp_filetype_gt_lang: FiletypeGTLang,
    pt_br_filetype_gt_lang: FiletypeGTLang,
) -> None:
    assert en_us_filetype_gt_lang.content == EN_US_CONTENT
    assert zh_cn_filetype_gt_lang.content == ZH_CN_CONTENT
    assert ja_jp_filetype_gt_lang.content == JA_JP_CONTENT
    assert pt_br_filetype_gt_lang.content == PT_BR_CONTENT


def test__get_properties(
    en_us_filetype_gt_lang: FiletypeGTLang,
    zh_cn_filetype_gt_lang: FiletypeGTLang,
    ja_jp_filetype_gt_lang: FiletypeGTLang,
    pt_br_filetype_gt_lang: FiletypeGTLang,
) -> None:
    assert en_us_filetype_gt_lang.properties == {
        "gt-lang|    S:test": Property("gt-lang|    S:test", "test", "    S:test=test", 107, 111),
    }
    assert zh_cn_filetype_gt_lang.properties == {
        "gt-lang|    S:test": Property("gt-lang|    S:test", "测试", "    S:test=测试", 127, 129),
    }
    assert ja_jp_filetype_gt_lang.properties == {
        "gt-lang|    S:test": Property("gt-lang|    S:test", "テスト", "    S:test=テスト", 127, 130),
    }
    assert pt_br_filetype_gt_lang.properties == {
        "gt-lang|    S:test": Property("gt-lang|    S:test", "teste", "    S:test=teste", 127, 130),
    }



def test_get_en_us_relpath(
    en_us_filetype_gt_lang: FiletypeGTLang,
    zh_cn_filetype_gt_lang: FiletypeGTLang,
    ja_jp_filetype_gt_lang: FiletypeGTLang,
    pt_br_filetype_gt_lang: FiletypeGTLang,
) -> None:
    assert en_us_filetype_gt_lang.get_en_us_relpath() == EN_US_RELPATH
    assert zh_cn_filetype_gt_lang.get_en_us_relpath() == EN_US_RELPATH
    assert ja_jp_filetype_gt_lang.get_en_us_relpath() == EN_US_RELPATH
    assert pt_br_filetype_gt_lang.get_en_us_relpath() == EN_US_RELPATH


def test_get_zh_cn_relpath(
    en_us_filetype_gt_lang: FiletypeGTLang,
    zh_cn_filetype_gt_lang: FiletypeGTLang,
    ja_jp_filetype_gt_lang: FiletypeGTLang,
    pt_br_filetype_gt_lang: FiletypeGTLang,
) -> None:
    assert en_us_filetype_gt_lang.get_target_language_relpath(Language.en_US) == EN_US_RELPATH
    assert zh_cn_filetype_gt_lang.get_target_language_relpath(Language.zh_CN) == ZH_CN_RELPATH
    assert ja_jp_filetype_gt_lang.get_target_language_relpath(Language.ja_JP) == JA_JP_RELPATH
    assert pt_br_filetype_gt_lang.get_target_language_relpath(Language.pt_BR) == PT_BR_RELPATH
