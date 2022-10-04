import json
import os
from pathlib import Path
from typing import TypedDict, Union
import requests
from requests import Response

from internal.comparable import Property


class ParatranzItem(TypedDict):
    key: str
    original: str
    translation: str
    context: str


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
            translated_props: dict[str, Property] = {},
            encode: bool = False):
    items: list[ParatranzItem] = []
    for key, prop in source_props.items():
        item: ParatranzItem = {
            "key": key,
            "original": prop.value,
        }
        translated_item = translated_props.get(key, None)
        if translated_item is not None:
            item["translation"] = translated_item.value if not encode else translated_item.value.encode(
                'ascii').decode('unicode_escape')
        item["context"] = "{}:{}".format(prop.start, prop.end)
        items.append(item)
    if os.path.dirname(target_file) != "":
        os.makedirs(os.path.dirname(target_file), exist_ok=True)
    with open(target_file, "w") as fp:
        json.dump(items, fp, indent=4, ensure_ascii=False)
