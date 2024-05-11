
ifndef NDKPATH
    $(error NDKPATH not set)
endif

all: build_android


build_android:
	(cd  jni; ${NDKPATH}/ndk-build V=1)
	adb push libs/armeabi-v7a/libpatchgame.so /data/local/tmp

clean:
	(cd  jni; ${NDKPATH}/ndk-build clean)

