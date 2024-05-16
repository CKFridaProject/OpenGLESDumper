

#include <stdio.h>
#include <GLES2/gl2.h>
#include <GLES2/gl2ext.h>
#include <GLES3/gl32.h>
#include <ftw.h>
#include <sys/stat.h>
#include <unistd.h>
#include <curl/curl.h>

#include "utils.h"


size_t write_data(void *ptr, size_t size, size_t nmemb, void *stream) {
    *(size_t*)stream += size * nmemb;
    return size * nmemb;
}

size_t get_body_size(const char *url) {
    CURL *curl;
    CURLcode res;
    size_t len = 0;

    curl_global_init(CURL_GLOBAL_DEFAULT);
    curl = curl_easy_init();

    if(curl) {
        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_NOBODY, 0L); // get body
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_data);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &len);

        res = curl_easy_perform(curl);
        if(res != CURLE_OK) {
            fprintf(stderr, "curl_easy_perform() failed: %sn",
                    curl_easy_strerror(res));
        }

        curl_easy_cleanup(curl);
    }

    curl_global_cleanup();
    return len;
}


extern "C" int __attribute__((visibility("default"))) writeTextFile (const char* filename, char* context) {
    FILE* fp = fopen(filename, "w");
    if (fp == (void*)0) {
        return -1;
    }
    int ret = fprintf(fp, "%s", context);
    fclose(fp);
    return ret;
}

static const char base64_chars[] =
             "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
             "abcdefghijklmnopqrstuvwxyz"
             "0123456789+/";

extern "C" int __attribute__((visibility("default"))) base64_encode(const unsigned char *in, int in_len, char *out, int out_len) {
    int i, j;
    int output_len = 4 * ((in_len + 2) / 3);

    if (out != NULL) {
        for (i = 0, j = 0; i < in_len; i += 3, j += 4) {
            int a = in[i];
            int b = (i + 1 < in_len) ? in[i + 1] : 0;
            int c = (i + 2 < in_len) ? in[i + 2] : 0;

            out[j] = base64_chars[a >> 2];
            out[j + 1] = base64_chars[((a & 0x03) << 4) | (b >> 4)];
            out[j + 2] = (i + 1 < in_len) ? base64_chars[((b & 0x0F) << 2) | (c >> 6)] : '=';
            out[j + 3] = (i + 2 < in_len) ? base64_chars[c & 0x3F] : '=';
        }

        if (j < out_len) {
            out[j] = '0';
        }
    }

    return output_len;
}


int delete_file(const char *path, const struct stat *s, int type, struct FTW *ftwb) {
    if(remove(path) < 0) {
        perror("remove");
        return -1;
    }
    return 0;
}

int delete_and_remake_folder(const char *folder_path) {
    if (nftw(folder_path, delete_file, 64, FTW_DEPTH | FTW_PHYS) < 0) {
        perror("nftw");
        return -1;
    }

    if (mkdir(folder_path, S_IRWXU | S_IRWXG | S_IROTH | S_IXOTH) < 0) {
        perror("mkdir");
        return -1;
    }

    return 0;
}



extern "C" int __attribute__((visibility("default"))) init (unsigned char* base, const char* outputDir) {


    LOG_INFOS(" go here %p %s", base, outputDir);
    delete_and_remake_folder(outputDir);

    return 0;
}


