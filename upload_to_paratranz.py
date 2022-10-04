import argparse
import os
from pathlib import Path

from utils import paratranz

proxies = {
    'http': 'http://172.28.224.1:10811',
    'https': 'http://172.28.224.1:10811',
}


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--json-path", dest="json_path", type=str, required=True)
    return parser.parse_args()


if __name__ == "__main__":

    token = os.getenv("PARATRANZ_TOKEN", None)
    assert token is not None, "Can not find env: `PARATRANZ_TOKEN`"

    args = parse_args()

    paratranz.set_token(token)
    paratranz.set_proxies(proxies)
    res = paratranz.get_files()
    files = res.json()
    files = dict(zip([f['name'] for f in files], files))
    i = 0

    resource_path = Path(args.json_path) / "resources"
    for resource in os.listdir(resource_path):
        resource: str
        file_name = "resources/" + resource
        file_rel_path = os.path.join(args.json_path, file_name)
        if i <= 228:
            del files[file_name]
            i += 1
            continue
        if file_name not in files:
            res = paratranz.upload_new_file(file_rel_path, "resources")
            print("upload", end=" ")
        else:
            res_orig, res = paratranz.update_file(file_rel_path, files[file_name]['id'])
            del files[file_name]
            print("update", end=" ")
        print(i, file_name, res.status_code, res.reason)
        i += 1

    script_path = Path(args.json_path) / "scripts"
    for script in os.listdir(script_path):
        script: str
        file_name = "scripts/" + script
        file_rel_path = os.path.join(args.json_path, file_name)
        if i <= 228:
            del files[file_name]
            i += 1
            continue
        if file_name not in files:
            res = paratranz.upload_new_file(file_rel_path, 'scripts')
            print("upload", end=" ")
        else:
            res_orig, res = paratranz.update_file(file_rel_path, files[file_name]['id'])
            del files[file_name]
            print("update", end=" ")
        print(i, file_name, res.status_code, res.reason)
        i += 1

    quest = "quest.json"
    quest_rel_path = Path(args.json_path) / quest
    if quest not in files:
        res = paratranz.upload_new_file(quest_rel_path, '')
        print("upload", end=" ")
    else:
        res_original, res = paratranz.update_file(quest_rel_path, files[quest]['id'])
        del files[quest]
        print("update", end=" ")
    print(i, "quest", res.status_code, res.reason)
    i += 1

    # for key, item in files.items():
    #     res = paratranz.delete_file(item['id'])
    #     print("delete", i, key, res.status_code, res.reason)



