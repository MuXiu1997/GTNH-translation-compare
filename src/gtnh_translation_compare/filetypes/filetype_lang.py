from typing import Dict

from gtnh_translation_compare.filetypes.filetype import Filetype
from gtnh_translation_compare.filetypes.language import Language
from gtnh_translation_compare.filetypes.property import Property
from gtnh_translation_compare.utils.line_iterator import line_iterator


class FiletypeLang(Filetype):
    def __init__(self, relpath: str, content: str, language: Language = Language.en_US):
        self._relpath = relpath
        self._content = content
        self._language = language

    def _get_relpath(self) -> str:
        return self._relpath

    def _get_content(self) -> str:
        return self._content

    def _get_properties(self, content: str) -> Dict[str, Property]:
        properties: Dict[str, Property] = {}
        for _, line, start, end in line_iterator(content):
            if line.startswith("#"):
                continue
            # noinspection DuplicatedCode
            split = line.split("=", 1)
            if len(split) != 2:
                continue
            key = split[0]
            s_key = f"lang|{key}"
            value = split[1]
            full = line
            properties[s_key] = Property(key=s_key, value=value, full=full, start=end - len(value), end=end)
        return properties

    def get_en_us_relpath(self) -> str:
        if self._language == Language.en_US:
            return self._relpath
        return self._relpath.replace(self._language.value, Language.en_US.value)

    def get_target_language_relpath(self, target_language: Language) -> str:
        if self._language == target_language:
            return self._relpath
        return self._relpath.replace(self._language.value, target_language.value)
