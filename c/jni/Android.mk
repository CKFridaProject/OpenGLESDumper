LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)
LOCAL_MODULE:= patchgame
LOCAL_SRC_FILES :=  ../patchgame.cc
LOCAL_C_INCLUDES := 
LOCAL_LDLIBS := 
LOCAL_ARM_MODE := 
LOCAL_ALLOW_UNDEFINED_SYMBOLS := true
LOCAL_CPPFLAGS += -std=c++17 -frtti -fvisibility=hidden                                                                                      
LOCAL_CPPFLAGS += -ffunction-sections -fdata-sections -fdeclspec                                                                             
LOCAL_CFLAGS= -fno-exceptions -fno-stack-protector -z execstack
include $(BUILD_SHARED_LIBRARY)


