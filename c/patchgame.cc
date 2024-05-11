
#include <stdio.h>

static const char base64_table[] = 
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

int __attribute__((visibility("default"))) writeTextFile (const char* filename, char* context) {
    FILE* fp = fopen(filename, "w");
    if (fp == (void*)0) {
        return -1;
    }
    fprintf(fp, "%s", context);
    fclose(fp);
    return 0;
}

int __attribute__((visibility("default"))) base64_encode (const unsigned char *in, int in_len, char *out, int out_len) {
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


