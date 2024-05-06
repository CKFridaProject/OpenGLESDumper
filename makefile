
pull_dumps:
	rm -fr dumps && adb pull /storage/emulated/0/Android/data/com.namcobandaigames.spmoja010E/files/dumps
	(echo -n "["; ls dumps | sed 's/.*/"&"/' | sed '$$!s/$$/,/' | tr '\n' ' '; echo -n "]") | tee dist/dumps.json

