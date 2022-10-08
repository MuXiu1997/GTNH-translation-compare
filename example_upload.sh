
MOD_PACK=../gtnh2200
TRANSLATED=../translated
PARATRANZ_JSON=./paratranz-json
PARATRANZ_TRANSLATED=./paratranz-translated

# get mod pack
wget http://downloads.gtnewhorizons.com/ClientPacks/GT_New_Horizons_2.2.0.0_CLIENT.zip

# unzip to upper folder
unzip GT_New_Horizons_2.2.0.0_CLIENT.zip -d ${MOD_PACK}

git clone -b 2.2.0.0 https://github.com/Kiwi233/Translation-of-GTNH.git ${TRANSLATED}

python convert_lang_and_zs.py --mod-pack-path ${MOD_PACK} --translated-pack-path ${TRANSLATED} --output-path ${PARATRANZ_JSON}

python convert_quest_book.py --repo-path ${TRANSLATED} --output-path ${PARATRANZ_JSON}

# upload to paratranz
python upload_to_paratranz.py --json-path ${PARATRANZ_JSON}
