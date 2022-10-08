import json
import os
from pathlib import Path
from typing import TypedDict, Union, Tuple
import requests
from requests import Response

from internal.comparable import Property


class ParatranzItem(TypedDict):
    key: str
    original: str
    translation: str
    context: str

class ParatranzContext(TypedDict):
    p: Tuple[int, int]
    d: str


BASE_URL = "https://paratranz.cn/api/"
PROJECT_ID = 5243

_TOKEN = None

_PROXIES = None


def set_token(token):
    global _TOKEN
    _TOKEN = token


def set_proxies(proxy):
    global _PROXIES
    _PROXIES = proxy


def get_files():
    res = requests.get(BASE_URL + f"projects/{PROJECT_ID}/files", headers={
        'Authorization': _TOKEN
    }, proxies=_PROXIES)
    return res


def upload_new_file(file: Union[str, Path], directory: str):
    res = requests.post(BASE_URL + f"projects/{PROJECT_ID}/files", headers={
        'Authorization': _TOKEN
    }, files={
        'file': open(file, "rb"),
    }, data={
        'path': directory
    }, proxies=_PROXIES)
    return res


def update_file(file: Union[str, Path], file_id: int) -> tuple[Response, Response]:
    # update original
    res_original = requests.post(BASE_URL + f"projects/{PROJECT_ID}/files/{file_id}", headers={
        'Authorization': _TOKEN
    }, files={
        'file': open(file, "rb"),
    }, proxies=_PROXIES)
    # update translation
    res_translation = requests.post(BASE_URL + f"projects/{PROJECT_ID}/files/{file_id}", headers={
        'Authorization': _TOKEN
    }, files={
        'file': open(file, "rb"),
    }, proxies=_PROXIES)
    return res_original, res_translation


def delete_file(file_id: int):
    res = requests.delete(BASE_URL + f"projects/{PROJECT_ID}/files/{file_id}", headers={
        'Authorization': _TOKEN
    }, proxies=_PROXIES)
    return res


def trigger_export():
    res = requests.post(BASE_URL + f"projects/{PROJECT_ID}/artifacts", headers={
        'Authorization': _TOKEN
    }, proxies=_PROXIES)
    return res


def download(target: str):
    r = requests.get(BASE_URL + f"projects/{PROJECT_ID}/artifacts/download", headers={
        'Authorization': _TOKEN
    }, allow_redirects=True)
    with open(target, 'wb') as fp:
        fp.write(r.content)


def to_json(source_props: dict[str, Property],
            target_file: str,
            translated_props: dict[str, Property] = None,
            encode: bool = False):
    if translated_props is None:
        translated_props: dict[str, Property] = {}
    items: list[ParatranzItem] = []
    for uni_key, prop in source_props.items():
        item: ParatranzItem = {
            "key": uni_key,
            "original": prop.value,
        }
        context: ParatranzContext = {
            "p": (prop.start, prop.end)
        }
        if prop.duplicated:
            item["translation"] = "重复的 key，请忽略"
            context["d"] = prop.key
        else:
            translated_item = translated_props.get(prop.key, None)
            if translated_item is not None:
                if encode:
                    item["translation"] = translated_item.value.encode('ascii').decode('unicode_escape')
                else:
                    item["translation"] = translated_item.value
        item["context"] = json.dumps(context)
        items.append(item)
    if os.path.dirname(target_file) != "":
        os.makedirs(os.path.dirname(target_file), exist_ok=True)
    with open(target_file, "w") as fp:
        json.dump(items, fp, indent=4, ensure_ascii=False)


def translated_content(en_content: str,
                       translated_items: list[ParatranzItem],
                       re_encode: bool = False) -> str:
    content = ""
    last_end = 0
    for item in translated_items:
        context: ParatranzContext = json.loads(item["context"])
        start, end = context["p"]
        value = ""
        if "d" in context:
            # FIXME: if not found
            for inner_item in translated_items:
                if inner_item["key"] == context["d"]:
                    value = inner_item["translation"]
                    break
        elif "translation" in item and item["translation"] != "":
            value = item["translation"]
        else:
            value = item["original"]
        if re_encode:
            value = value.encode("unicode_escape").decode('ascii')

        content += en_content[last_end:start] + value
        last_end = end
    content += en_content[last_end:]
    return content
