

PATCH_SONAME:=libpatchgame

SO2TS_PY=./utils/so2ts.py

all:  build_c convert_so
	./node_modules/frida-compile/bin/compile.js frida-src/index.ts -o _agent.js -c -S -t tsconfig.frida.json

build_c:
	make -C c


clean:
	make -C c clean
	rm -fr ./modinfos/lib*.ts _agent.js

.PHONY: convert_so

convert_so:
	@if [ -e  ./c/libs/`adb shell getprop ro.product.cpu.abi`/${PATCH_SONAME}.so ]; then   \
	    echo converting ./c/./libs/`adb shell getprop ro.product.cpu.abi`/${PATCH_SONAME}.so ;  \
	    ${SO2TS_PY} --no-content -b  ./c/./libs/`adb shell getprop ro.product.cpu.abi`/${PATCH_SONAME}.so  -o ./modinfos/${PATCH_SONAME}.ts;  \
	elif [ -e ./c/libs/armeabi-v7a/${PATCH_SONAME}.so ]; then  \
	    echo converting ./c/libs/armeabi-v7a/${PATCH_SONAME}.so ;   \
	    ${SO2TS_PY} --no-content -b  ./c/libs/armeabi-v7a/${PATCH_SONAME}.so  -o ./modinfos/${PATCH_SONAME}.ts;  \
    else  \
	    echo "checked " ./c/./libs/`adb shell getprop ro.product.cpu.abi`/${PATCH_SONAME}.so;  \
	    echo "checked " ./c/./libs/armeabi-v7a/${PATCH_SONAME}.so;  \
	    echo "can not convert {PATCH_SONAME}.so ";  \
	    exit  -2 ;  \
    fi 

