
#include <stdio.h>
#include <curl/curl.h>
#include <GLES2/gl2.h>

extern "C" void _frida_log(const char* message);
extern "C" void _frida_err(const char* message, bool exit=false);
extern "C" void _frida_hexdump(void* ptr, int len=0x20);

#define LOG_INFOS_WITH_N(N, fmt, args...)                         \
do{                                                               \
    char buff[N];                                                 \
    snprintf(buff, N,  fmt , ##args);                             \
    _frida_log(buff);                                    \
}while(0)

#define LOG_INFOS_WITH_N_FILE_LINE(N, fmt, args...)               \
LOG_INFOS_WITH_N(N, "[%s:%d] " fmt , __FILE__, __LINE__,  ##args);

#define LOG_INFOS(fmt, args...)  LOG_INFOS_WITH_N_FILE_LINE(0x800, fmt, ##args)


// Write data callback function (called within the context of
// curl_easy_perform.

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





static const char base64_table[] = 
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

extern "C" int __attribute__((visibility("default"))) writeTextFile (const char* filename, char* context) {
    FILE* fp = fopen(filename, "w");
    if (fp == (void*)0) {
        return -1;
    }
    fprintf(fp, "%s", context);
    fclose(fp);
    return 0;
}

extern "C" int __attribute__((visibility("default"))) base64_encode (const unsigned char *in, int in_len, char *out, int out_len) {
    int i, j;
    int enc_len = 4 * ((in_len + 2) / 3); // Base64 string length

    if (out_len < enc_len + 1) { // Check if the output buffer is big enough
        return -1; // Not enough space
    }

    for (i = 0, j = 0; i < in_len;) {
        unsigned int octet_a = i < in_len ? (unsigned char)in[i++] : 0;
        unsigned int octet_b = i < in_len ? (unsigned char)in[i++] : 0;
        unsigned int octet_c = i < in_len ? (unsigned char)in[i++] : 0;

        unsigned int triple = (octet_a << 0x10) + (octet_b << 0x08) + octet_c;

        out[j++] = base64_table[(triple >> 3 * 6) & 0x3F];
        out[j++] = base64_table[(triple >> 2 * 6) & 0x3F];
        out[j++] = base64_table[(triple >> 1 * 6) & 0x3F];
        out[j++] = base64_table[(triple >> 0 * 6) & 0x3F];
    }

    for (i = 0; i < enc_len - j; i++) {
        out[enc_len - 1 - i] = '='; // Add padding
    }
    out[enc_len] = '0'; // Null-terminate the string

    return enc_len; // Return the length of the Base64 encoded string
}


extern "C" int __attribute__((visibility("default"))) init (unsigned char* base, const char* outputDir) {

    LOG_INFOS(" go here %p %s", base, outputDir);
    const char* url = "http://192.168.2.196:3000/";
    auto sz =  get_body_size(url);
    LOG_INFOS("size: %d", sz);
    return 0;
}

extern "C" void __attribute__((visibility("default"))) hook_glCompressedTexImage2D (
    GLenum          target,
    GLint           level,
    GLenum          internalformat,
    GLsizei         width,
    GLsizei         height,
    GLint           border,
    GLsizei         imageSize,
    const GLvoid *  data
) {

}

