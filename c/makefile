
ifndef NDKPATH
    $(error NDKPATH not set)
endif

all: build_android

PATCH_SONAME=libpatchgame

build_android:
	(cd  jni; ${NDKPATH}/ndk-build V=1)
	@if [ -e  ./libs/`adb shell getprop ro.product.cpu.abi`/${PATCH_SONAME}.so ]; then   \
	    echo pushing ././libs/`adb shell getprop ro.product.cpu.abi`/${PATCH_SONAME}.so ;  \
	    adb push ./libs/`adb shell getprop ro.product.cpu.abi`/${PATCH_SONAME}.so /data/local/tmp;  \
	elif [ -e ./libs/armeabi-v7a/${PATCH_SONAME}.so ]; then  \
	    echo puash ./libs/armeabi-v7a/${PATCH_SONAME}.so ;   \
	    adb push ./libs/armeabi-v7a/${PATCH_SONAME}.so /data/local/tmp;  \
    else  \
	    echo "checked " ./libs/`adb shell getprop ro.product.cpu.abi`/${PATCH_SONAME}.so;  \
	    echo "checked " ./libs/armeabi-v7a/${PATCH_SONAME}.so;  \
	    echo "can not push ${PATCH_SONAME}.so ";  \
	    exit  -2 ;  \
    fi 

clean:
	(cd  jni; ${NDKPATH}/ndk-build clean)

