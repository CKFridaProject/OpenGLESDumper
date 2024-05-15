

#include <stdio.h>
#include <GLES2/gl2.h>
#include <GLES3/gl32.h>
#include <ftw.h>
#include <sys/stat.h>
#include <unistd.h>
#include <curl/curl.h>

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


struct TextureInfo {
    int width;
    int height;
    int internalFormat;   
    int isCompressed;
};

extern "C" int __attribute__((visibility("default"))) getCurrentTexture2DInfo (TextureInfo* info, int level) {
    if(info == NULL) {
        return -1;
    }
    int width, height, internalFormat, isCompressed;

    // Get the width, height, and internal format of the currently bound texture
    glGetTexLevelParameteriv(GL_TEXTURE_2D, level, GL_TEXTURE_WIDTH, &width);
    glGetTexLevelParameteriv(GL_TEXTURE_2D, level, GL_TEXTURE_HEIGHT, &height);
    glGetTexLevelParameteriv(GL_TEXTURE_2D, level, GL_TEXTURE_INTERNAL_FORMAT, &internalFormat);
    glGetTexLevelParameteriv(GL_TEXTURE_2D, level, GL_TEXTURE_COMPRESSED, &isCompressed);


    LOG_INFOS("width: %d, height: %d, internalFormat: %d, isCompressed: %d", width, height, internalFormat, isCompressed);

    info->width = width;
    info->height = height;
    info->internalFormat = internalFormat;
    info->isCompressed = isCompressed;
    return 0;
}

extern "C" int __attribute__((visibility("default"))) getCurrentTexture2DId () {
    int textureID=0;
    // Get the currently bound texture ID
    glGetIntegerv(GL_TEXTURE_BINDING_2D, &textureID);

    LOG_INFOS("textureID: %d", textureID);

    return textureID;
}

extern "C" int __attribute__((visibility("default"))) testOpenGL (unsigned char* base, const char* outputDir) {
    const GLubyte* versionGL = glGetString(GL_VERSION); 
    LOG_INFOS("versionGL: %s", versionGL);
    return 0;
}

extern "C" int __attribute__((visibility("default"))) init (unsigned char* base, const char* outputDir) {


    LOG_INFOS(" go here %p %s", base, outputDir);
    delete_and_remake_folder(outputDir);

    //const char* url = "http://192.168.2.196:3000/";
    //auto sz =  get_body_size(url);
    //LOG_INFOS("size: %d", sz);
    return 0;
}


void SaveTextureToFile(GLuint textureId, int width, int height, const char* filename) {
    glBindTexture(GL_TEXTURE_2D, textureId);

    // Allocate memory for pixel data
    GLubyte* pixels = new GLubyte[width * height * 4];

    // Set up framebuffer and renderbuffer
    GLuint framebuffer, renderbuffer;
    glGenFramebuffers(1, &framebuffer);
    glGenRenderbuffers(1, &renderbuffer);

    glBindFramebuffer(GL_FRAMEBUFFER, framebuffer);
    glBindRenderbuffer(GL_RENDERBUFFER, renderbuffer);
    glRenderbufferStorage(GL_RENDERBUFFER, GL_RGBA8, width, height);
    glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_RENDERBUFFER, renderbuffer);

    // Attach the texture to the FBO
    glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, textureId, 0);

    // Check FBO status
    GLenum status = glCheckFramebufferStatus(GL_FRAMEBUFFER);
    if (status != GL_FRAMEBUFFER_COMPLETE) {
        LOG_INFOS("Failed to setup Framebuffer status: %d", status);
        return;
    }

    // Read the pixel data
    glReadPixels(0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, pixels);

    // Open a binary file in write mode
    FILE* outFile = fopen(filename, "wb");
    if(outFile == NULL) {
        LOG_INFOS("Failed to open file: %s", filename);
        delete [] pixels;
        return ;
    }

    // Write width, height, and format
    fwrite(&width, sizeof(width), 1, outFile);
    fwrite(&height, sizeof(height), 1, outFile);
    GLenum format = GL_RGBA;
    fwrite(&format, sizeof(format), 1, outFile);

    // Write the pixel data
    fwrite(pixels, 1, width * height * 4, outFile);

    // Clean up
    delete[] pixels;
    glDeleteFramebuffers(1, &framebuffer);
    glDeleteRenderbuffers(1, &renderbuffer);

    // Close the file
    fclose(outFile);

    LOG_INFOS("write texture to file: %s", filename);
}



extern "C" int __attribute__((visibility("default"))) hookOpenGL (unsigned char* base, const char* outputDir) {
    static int count = 0;
    if(count == 0) {
        
        const GLubyte* versionGL = glGetString(GL_VERSION); 
        LOG_INFOS("versionGL: %s", versionGL);

        {
            int originalTextureID = 0;
            glGetIntegerv(GL_TEXTURE_BINDING_2D, &originalTextureID);
            // list all texture2d
            for ( int t=0;t< 3000;t++){
                if(glIsTexture(t)){
                    glBindTexture(GL_TEXTURE_2D, t);

                    int level = 0;
                    int width=0, height=0, internalFormat=0, isCompressed=0;

                    // Get the width, height, and internal format of the currently bound texture
                    glGetTexLevelParameteriv(GL_TEXTURE_2D, level, GL_TEXTURE_WIDTH, &width);
                    glGetTexLevelParameteriv(GL_TEXTURE_2D, level, GL_TEXTURE_HEIGHT, &height);
                    glGetTexLevelParameteriv(GL_TEXTURE_2D, level, GL_TEXTURE_INTERNAL_FORMAT, &internalFormat);
                    glGetTexLevelParameteriv(GL_TEXTURE_2D, level, GL_TEXTURE_COMPRESSED, &isCompressed);
                    LOG_INFOS("glIsTexture: %d width: %d, height: %d, internalFormat: 0x%x, isCompressed: %d", 
                        t, width, height, internalFormat, isCompressed);

                    {
                        

                        static char filename[1024];
                        sprintf(filename,"%s/%08d.bin", outputDir, t);
                        SaveTextureToFile(t,  width,  height, filename) ;

                    }
                }
            }

            glBindTexture(GL_TEXTURE_2D, originalTextureID);

        }
    }
    count++;
    return 0;
}

