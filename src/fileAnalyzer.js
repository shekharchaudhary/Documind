const fs = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');
const mime = require('mime-types');
require('dotenv').config();

class FileAnalyzer {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // Define comprehensive list of supported file types
        this.supportedTypes = {
            // Text and Documentation
            'text/plain': true,           // .txt
            'text/markdown': true,        // .md, .markdown
            'text/html': true,            // .html, .htm
            'text/css': true,             // .css
            'text/csv': true,             // .csv
            'text/tab-separated-values': true, // .tsv
            'text/calendar': true,        // .ics
            'text/rtf': true,             // .rtf
            'text/x-log': true,           // .log
            'text/x-diff': true,          // .diff, .patch
            'text/x-sfv': true,           // .sfv
            'text/uri-list': true,        // .uri
            'text/vcard': true,           // .vcf
            'text/x-vcard': true,         // .vcard
            'text/x-yaml': true,          // .yaml, .yml
            'text/x-ini': true,           // .ini
            'text/x-nfo': true,           // .nfo
            'text/x-readme': true,        // README
            'text/x-changelog': true,     // CHANGELOG
            'text/x-license': true,       // LICENSE
            'text/x-makefile': true,      // Makefile

            // Programming Languages - Common
            'text/javascript': true,      // .js
            'text/typescript': true,      // .ts
            'text/x-python': true,        // .py
            'text/x-java': true,          // .java
            'text/x-c': true,             // .c
            'text/x-cpp': true,           // .cpp
            'text/x-ruby': true,          // .rb
            'text/x-php': true,           // .php
            'text/x-swift': true,         // .swift
            'text/x-go': true,            // .go
            'text/x-rust': true,          // .rs
            'text/x-kotlin': true,        // .kt
            'text/x-scala': true,         // .scala
            'text/x-perl': true,          // .pl
            'text/x-lua': true,           // .lua
            'text/x-r': true,             // .r
            'text/x-matlab': true,        // .m
            'text/x-fortran': true,       // .f, .for
            'text/x-pascal': true,        // .pas
            'text/x-cobol': true,         // .cob
            'text/x-ada': true,           // .ada
            'text/x-basic': true,         // .bas
            'text/x-haskell': true,       // .hs
            'text/x-erlang': true,        // .erl
            'text/x-elixir': true,        // .ex
            'text/x-clojure': true,       // .clj
            'text/x-fsharp': true,        // .fs
            'text/x-d': true,             // .d
            'text/x-julia': true,         // .jl
            'text/x-ocaml': true,         // .ml
            'text/x-scheme': true,        // .scm
            'text/x-lisp': true,          // .lisp
            'text/x-prolog': true,        // .pl
            'text/x-sql': true,           // .sql
            'text/x-vhdl': true,          // .vhd
            'text/x-verilog': true,       // .v

            // Web Development
            'application/javascript': true,    // .js
            'application/typescript': true,    // .ts
            'application/json': true,          // .json
            'application/ld+json': true,       // .jsonld
            'application/x-httpd-php': true,   // .php
            'application/x-jsp': true,         // .jsp
            'application/x-asp': true,         // .asp
            'application/x-aspx': true,        // .aspx
            'application/graphql': true,       // .graphql
            'application/wasm': true,          // .wasm
            'application/dart': true,          // .dart
            'application/x-web-app-manifest+json': true, // .webmanifest

            // Document Formats
            'application/pdf': true,           // .pdf
            'application/rtf': true,           // .rtf
            'application/msword': true,        // .doc
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true, // .docx
            'application/vnd.oasis.opendocument.text': true, // .odt
            'application/vnd.ms-excel': true,  // .xls
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true, // .xlsx
            'application/vnd.oasis.opendocument.spreadsheet': true, // .ods
            'application/vnd.ms-powerpoint': true, // .ppt
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': true, // .pptx
            'application/vnd.oasis.opendocument.presentation': true, // .odp
            'application/vnd.ms-visio.drawing': true,  // .vsd
            'application/vnd.visio': true,     // .vsdx
            'application/x-tex': true,         // .tex
            'application/x-latex': true,       // .latex
            'application/epub+zip': true,      // .epub
            'application/x-iwork-pages-sffpages': true, // .pages
            'application/x-iwork-numbers-sffnumbers': true, // .numbers
            'application/x-iwork-keynote-sffkey': true, // .key

            // Data and Database
            'application/xml': true,           // .xml
            'application/x-yaml': true,        // .yaml
            'application/toml': true,          // .toml
            'application/x-sqlite3': true,     // .sqlite
            'application/x-mysql': true,       // .sql
            'application/x-postgresql': true,  // .sql
            'application/x-mongodb': true,     // .mongodb
            'application/x-redis': true,       // .redis
            'application/x-cassandra': true,   // .cql
            'application/x-parquet': true,     // .parquet
            'application/x-avro': true,        // .avro
            'application/x-protobuf': true,    // .proto
            'application/x-thrift': true,      // .thrift
            'application/x-msgpack': true,     // .msgpack
            'application/x-bson': true,        // .bson
            'application/x-cbor': true,        // .cbor

            // Configuration and Build
            'application/x-properties': true,  // .properties
            'application/x-msdos-program': true, // .bat
            'application/x-sh': true,          // .sh
            'application/x-powershell': true,  // .ps1
            'application/x-ruby-program': true, // .rb
            'application/x-python-code': true, // .pyc
            'application/x-perl-program': true, // .pl
            'application/x-executable': true,  // .exe
            'application/x-msdownload': true,  // .dll
            'application/x-ms-installer': true, // .msi
            'application/x-setupscript': true, // .iss
            'application/x-deb': true,         // .deb
            'application/x-rpm': true,         // .rpm
            'application/x-xz': true,          // .xz
            'application/x-compress': true,    // .Z
            'application/zstd': true,          // .zst

            // 3D and CAD
            'model/gltf+json': true,          // .gltf
            'model/gltf-binary': true,        // .glb
            'model/x-3ds': true,              // .3ds
            'model/stl': true,                // .stl
            'model/obj': true,                // .obj
            'model/x-collada+xml': true,      // .dae
            'model/vrml': true,               // .wrl
            'model/x-blender': true,          // .blend
            'application/x-autocad': true,    // .dwg
            'application/x-step': true,       // .step
            'application/x-iges': true,       // .iges
            'application/x-catia': true,      // .catpart
            'application/x-solidworks': true, // .sldprt
            'application/x-rhino3d': true,    // .3dm

            // Scientific and Technical
            'application/mathematica': true,   // .nb
            'application/x-matlab-data': true, // .mat
            'application/x-scilab': true,      // .sci
            'application/x-octave': true,      // .oct
            'application/x-maple': true,       // .mw
            'application/x-sage': true,        // .sage
            'application/x-jupyter': true,     // .ipynb
            'application/x-spss': true,        // .sav
            'application/x-stata': true,       // .dta
            'application/x-qgis': true,        // .qgs
            'application/x-arcgis': true,      // .mxd

            // Game Development
            'application/x-unity3d': true,     // .unity
            'application/x-unreal': true,      // .uasset
            'application/x-godot': true,       // .tscn
            'application/x-gamemaker': true,   // .gmx
            'application/x-rpgmaker': true,    // .rxdata
            'application/x-love-game': true,   // .love

            // Audio Processing
            'application/x-csound': true,      // .csd
            'application/x-pd': true,          // .pd
            'application/x-supercollider': true, // .scd
            'application/x-max': true,         // .maxpat
            'application/x-chuck': true,       // .ck

            // Version Control
            'application/x-git': true,         // .git
            'application/x-subversion': true,  // .svn
            'application/x-mercurial': true,   // .hg
            'application/x-bazaar': true,      // .bzr

            // Container and Deployment
            'application/x-docker': true,      // Dockerfile
            'application/x-kubernetes': true,  // .yaml
            'application/x-helm': true,        // .helm
            'application/x-terraform': true,   // .tf
            'application/x-ansible': true,     // .ansible
            'application/x-puppet': true,      // .pp
            'application/x-chef': true,        // .chef
            'application/x-vagrant': true,     // Vagrantfile

            // Email and Communication
            'message/rfc822': true,            // .eml
            'application/vnd.ms-outlook': true, // .msg
            'application/mbox': true,          // .mbox
            'application/x-imap': true,        // .imap
            'application/x-pop3': true,        // .pop3

            // Archive Formats
            'application/zip': true,           // .zip
            'application/x-rar-compressed': true, // .rar
            'application/x-7z-compressed': true, // .7z
            'application/x-tar': true,         // .tar
            'application/x-gzip': true,        // .gz
            'application/x-bzip2': true,       // .bz2
            'application/x-lzma': true,        // .lzma
            'application/x-xar': true,         // .xar
            'application/x-stuffit': true,     // .sit
            'application/x-iso9660-image': true, // .iso

            // Fonts
            'application/x-font-ttf': true,    // .ttf
            'application/x-font-otf': true,    // .otf
            'application/x-font-woff': true,   // .woff
            'application/x-font-woff2': true,  // .woff2
            'application/vnd.ms-fontobject': true, // .eot

            // Other
            'application/octet-stream': true,  // Binary files
            'application/x-binary': true,      // Binary files
            'application/x-unknown': true      // Unknown types
        };

        // Add comprehensive image format support
        const imageTypes = {
            // Raster Image Formats
            'image/jpeg': true,           // .jpg, .jpeg, .jpe, .jif, .jfif
            'image/png': true,            // .png
            'image/gif': true,            // .gif
            'image/webp': true,           // .webp
            'image/tiff': true,           // .tif, .tiff
            'image/bmp': true,            // .bmp, .dib
            'image/x-icon': true,         // .ico
            'image/heic': true,           // .heic
            'image/heif': true,           // .heif
            'image/avif': true,           // .avif
            'image/jxr': true,            // .jxr, .hdp, .wdp
            'image/x-portable-pixmap': true, // .ppm
            'image/x-portable-graymap': true, // .pgm
            'image/x-portable-bitmap': true,  // .pbm
            'image/x-portable-anymap': true,  // .pnm
            'image/x-raw': true,          // Various RAW formats

            // Vector Image Formats
            'image/svg+xml': true,        // .svg, .svgz
            'image/x-eps': true,          // .eps, .epsi, .epsf
            'image/vnd.adobe.illustrator': true, // .ai
            'image/x-xcf': true,          // .xcf (GIMP)
            'image/x-psd': true,          // .psd (Photoshop)
            'image/x-cdr': true,          // .cdr (CorelDRAW)
            'image/x-emf': true,          // .emf (Enhanced Metafile)
            'image/x-wmf': true,          // .wmf (Windows Metafile)

            // Screenshot and Screen Capture
            'image/x-screenshot': true,    // Various screenshot formats
            'image/x-ms-bmp': true,       // Windows bitmap
            'image/x-tga': true,          // .tga (Truevision)
            'image/x-pcx': true,          // .pcx (PiCture eXchange)

            // Scientific and Medical Imaging
            'image/x-dicom': true,        // .dcm, .dic (DICOM)
            'image/x-nifti': true,        // .nii (NIfTI)
            'image/x-minc': true,         // .mnc (MINC)
            'image/x-analyze': true,      // .hdr, .img (Analyze)

            // Other Specialized Formats
            'image/jp2': true,            // .jp2 (JPEG 2000)
            'image/jpm': true,            // .jpm (JPEG 2000)
            'image/jpx': true,            // .jpx (JPEG 2000)
            'image/jxl': true,            // .jxl (JPEG XL)
            'image/x-exr': true,          // .exr (OpenEXR)
            'image/x-dds': true           // .dds (DirectDraw Surface)
        };

        // Merge image types into supported types
        this.supportedTypes = { ...this.supportedTypes, ...imageTypes };

        // Additional file extensions and special files
        this.additionalExtensions = [
            // Development and Build
            '.env', '.env.local', '.env.development', '.env.production',
            '.babelrc', '.eslintrc', '.prettierrc', '.stylelintrc',
            '.editorconfig', '.gitignore', '.gitattributes', '.gitmodules',
            '.npmrc', '.yarnrc', '.nvmrc', '.python-version', '.ruby-version',
            'Gemfile', 'Rakefile', 'Procfile', 'Brewfile',
            'CMakeLists.txt', 'configure.ac', 'Makefile.am',
            'package.json', 'package-lock.json', 'yarn.lock',
            'requirements.txt', 'setup.py', 'pyproject.toml',
            'composer.json', 'composer.lock', 'build.gradle',
            'pom.xml', 'build.sbt', 'project.clj',

            // Web Development
            '.jsx', '.tsx', '.vue', '.svelte', '.astro', '.liquid',
            '.sass', '.scss', '.less', '.styl',
            '.htaccess', '.htpasswd', 'robots.txt', 'sitemap.xml',
            'manifest.json', 'browserconfig.xml',

            // Mobile Development
            '.xcodeproj', '.pbxproj', '.swift', '.storyboard', '.xib',
            '.gradle', '.properties', 'gradlew', 'proguard-rules.pro',
            'AndroidManifest.xml', 'Info.plist',

            // Data and Config
            '.csv', '.tsv', '.json5', '.jsonc', '.hjson', '.cson',
            '.conf', '.cfg', '.config', '.ini', '.properties',
            '.reg', '.inf', '.cnf', '.dist', '.template',

            // Documentation
            '.rst', '.adoc', '.asciidoc', '.creole', '.wiki',
            '.dokuwiki', '.mediawiki', '.pod', '.rdoc',
            'README', 'CHANGELOG', 'CONTRIBUTING', 'AUTHORS',
            'LICENSE', 'NOTICE', 'PATENTS', 'VERSION',

            // Testing
            '.spec', '.test', '.fixture', '.mock',
            '.feature', '.story', '.scenario',
            'phpunit.xml', 'jest.config.js', 'karma.conf.js',

            // Container and Cloud
            'Dockerfile', '.dockerignore', 'docker-compose.yml',
            'kubernetes.yaml', 'helm.yaml', 'terraform.tf',
            'serverless.yml', 'cloudbuild.yaml', 'azure-pipelines.yml',
            '.gitlab-ci.yml', '.travis.yml', 'appveyor.yml',

            // IDE and Editor
            '.vscode', '.idea', '.project', '.classpath',
            '.settings', '.sublime-project', '.sublime-workspace',

            // Shell and Scripts
            '.bash', '.zsh', '.fish', '.csh', '.ksh',
            '.cmd', '.bat', '.ps1', '.psm1', '.psd1',

            // Security
            '.pem', '.crt', '.key', '.csr', '.cer',
            '.p12', '.pfx', '.jks', '.keystore',

            // Other
            '.bak', '.tmp', '.temp', '.swp', '.ds_store',
            '.localized', '.metadata', '.project'
        ];

        // Add image-related extensions to additionalExtensions
        const imageExtensions = [
            '.jpg', '.jpeg', '.jpe', '.jif', '.jfif',
            '.png', '.gif', '.webp', '.tif', '.tiff',
            '.bmp', '.dib', '.ico', '.heic', '.heif',
            '.avif', '.jxr', '.hdp', '.wdp', '.svg',
            '.svgz', '.eps', '.epsi', '.epsf', '.ai',
            '.xcf', '.psd', '.cdr', '.emf', '.wmf',
            '.raw', '.cr2', '.nef', '.orf', '.sr2',
            '.dcm', '.dic', '.jp2', '.jpm', '.jpx',
            '.jxl', '.exr', '.dds', '.tga', '.pcx'
        ];

        this.additionalExtensions = [...this.additionalExtensions, ...imageExtensions];
    }

    async detectFileType(filePath) {
        const extension = path.extname(filePath).toLowerCase();
        const filename = path.basename(filePath).toLowerCase();
        const mimeType = mime.lookup(filePath) || 'application/octet-stream';

        // Check if the file extension or name is in our additional supported list
        const isAdditionalSupported = this.additionalExtensions.some(ext => {
            const extLower = ext.toLowerCase();
            return filename.endsWith(extLower) ||
                filename === extLower.substring(1) ||
                filename === extLower;
        });

        // Special handling for files without extensions
        const isSpecialFile = !extension && this.additionalExtensions.some(name =>
            filename === name.toLowerCase()
        );

        // Determine file category
        const fileCategory = this.determineFileCategory(mimeType, extension);

        return {
            extension,
            mimeType,
            filename,
            category: fileCategory,
            isText: this.isTextFile(mimeType, extension),
            isDocument: this.isDocumentFile(mimeType),
            isArchive: this.isArchiveFile(mimeType),
            isCode: this.isCodeFile(mimeType, extension),
            isConfig: this.isConfigFile(mimeType, filename),
            isData: this.isDataFile(mimeType, extension),
            isSupported: this.supportedTypes[mimeType] ||
                mimeType.startsWith('text/') ||
                isAdditionalSupported ||
                isSpecialFile
        };
    }

    determineFileCategory(mimeType, extension) {
        if (mimeType.startsWith('text/')) return 'Text';
        if (mimeType.includes('document')) return 'Document';
        if (mimeType.includes('sheet')) return 'Spreadsheet';
        if (mimeType.includes('presentation')) return 'Presentation';
        if (mimeType.includes('image')) return 'Image';
        if (mimeType.includes('audio')) return 'Audio';
        if (mimeType.includes('video')) return 'Video';
        if (mimeType.includes('compressed')) return 'Archive';
        if (mimeType.includes('application')) {
            if (extension.match(/\.(js|py|java|cpp|rb|php|cs|go|rs|swift)$/)) return 'Code';
            if (extension.match(/\.(json|xml|yaml|yml|toml|ini)$/)) return 'Configuration';
            if (extension.match(/\.(sql|db|sqlite)$/)) return 'Database';
        }
        return 'Other';
    }

    isTextFile(mimeType, extension) {
        return mimeType.startsWith('text/') ||
            mimeType === 'application/json' ||
            mimeType === 'application/xml' ||
            mimeType.includes('document') ||
            /\.(txt|md|csv|log|conf|ini|yml|yaml|json|xml)$/i.test(extension);
    }

    isDocumentFile(mimeType) {
        return mimeType.includes('document') ||
            mimeType.includes('pdf') ||
            mimeType.includes('presentation') ||
            mimeType.includes('spreadsheet');
    }

    isArchiveFile(mimeType) {
        return mimeType.includes('zip') ||
            mimeType.includes('tar') ||
            mimeType.includes('gzip') ||
            mimeType.includes('compressed');
    }

    isCodeFile(mimeType, extension) {
        return mimeType.includes('javascript') ||
            mimeType.includes('python') ||
            mimeType.includes('java') ||
            mimeType.includes('ruby') ||
            /\.(js|py|java|cpp|rb|php|cs|go|rs|swift|kt|scala|ts|jsx|tsx)$/i.test(extension);
    }

    isConfigFile(mimeType, filename) {
        return mimeType.includes('json') ||
            mimeType.includes('yaml') ||
            mimeType.includes('xml') ||
            /^[.].*rc$/.test(filename) ||
            /^[.](env|config|conf|cfg)/.test(filename);
    }

    isDataFile(mimeType, extension) {
        return mimeType.includes('json') ||
            mimeType.includes('xml') ||
            mimeType.includes('csv') ||
            /\.(json|xml|csv|tsv|sql|db|sqlite)$/i.test(extension);
    }

    async readFileContent(filePath) {
        const fileType = await this.detectFileType(filePath);

        if (!fileType.isSupported) {
            throw new Error(`File type ${fileType.mimeType} (${fileType.extension}) is not supported for analysis`);
        }

        // Handle text files
        const buffer = await fs.readFile(filePath);
        try {
            // First try UTF-8
            return buffer.toString('utf-8');
        } catch (e) {
            try {
                // Fallback to other encodings if UTF-8 fails
                return buffer.toString('ascii');
            } catch (e2) {
                throw new Error('Unable to read file content as text');
            }
        }
    }

    async analyzeFile(filePath, userQuery = 'Please summarize this file') {
        try {
            const fileType = await this.detectFileType(filePath);
            const stats = await fs.stat(filePath);

            console.log('Analyzing file:', {
                path: filePath,
                type: fileType,
                size: stats.size
            });

            const content = await this.readFileContent(filePath);

            // Precise system prompt for exact analysis
            const systemPrompt = `You are a precise document analyzer. Your task is to provide exact, factual information from the document.
            
            Document Properties:
            - Filename: ${path.basename(filePath)}
            - Type: ${fileType.mimeType}
            - Size: ${stats.size} bytes
            
            Guidelines for your analysis:
            1. ONLY use information explicitly stated in the document
            2. Use direct quotes when relevant
            3. Provide specific line references for key points
            4. Structure your response as follows:
               - MAIN POINTS: List the key points using exact words from the document
               - EXACT QUOTES: Include relevant direct quotes
               - SPECIFIC DETAILS: Any numbers, dates, or specific data mentioned
            5. Do not make assumptions or inferences beyond what's directly stated
            6. Keep responses concise and focused on exact content

            If answering a specific query, cite the exact parts of the document that address the query.`;

            // Precise user prompt
            const userPrompt = `Document content:
            ${content}

            ${userQuery === 'Please summarize this file' ?
                    'Extract and list the main points using exact words from the document. Include direct quotes for key information.' :
                    `Query: ${userQuery}\nProvide answer using only exact information from the document. Include direct quotes that support your answer.`}`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.3,
                max_tokens: 1500,
                presence_penalty: -0.5,
                frequency_penalty: 0.3
            });

            return {
                success: true,
                analysis: response.choices[0].message.content,
                metadata: {
                    filename: path.basename(filePath),
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    type: fileType.mimeType,
                    extension: fileType.extension
                }
            };
        } catch (error) {
            console.error('Analysis error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async summarizeFile(filePath) {
        return this.analyzeFile(filePath, 'Extract and list the exact main points from this document, using direct quotes where possible.');
    }

    async getFileMetadata(filePath) {
        try {
            const stats = await fs.stat(filePath);
            const fileType = await this.detectFileType(filePath);
            return {
                success: true,
                metadata: {
                    filename: path.basename(filePath),
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    type: fileType.mimeType,
                    extension: fileType.extension
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = FileAnalyzer; 