require('dotenv').config();

module.exports = {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    GUILD_ID: process.env.GUILD_ID,
    PANEL_DOMAIN: process.env.PANEL_DOMAIN,
    API_URL_USER_CREATE: process.env.API_URL_USER_CREATE,
    API_URL_SERVER_CREATE: process.env.API_URL_SERVER_CREATE,
    API_URL_ALLOCATIONS: process.env.API_URL_ALLOCATIONS,
    API_URL_USER_FETCH: process.env.API_URL_USER_FETCH,
    API_URL_SERVER_FETCH: process.env.API_URL_SERVER_FETCH,
    API_KEY: process.env.API_KEY,
    LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID,
    DB_PATH: './data.db',
    BOT_STATUS: 'online',
    ADMIN_ROLE_IDS: ['1388991108503179274', 'AdminRoleID2'],
    DEBUG_LOGGING: true,
    LOG_PREFIX: '[LOG]',

    SERVER_ENVIRONMENT: {
        NODE_ENV: "production",
        PORT: "3000",
        AUTO_UPDATE: true,
        PY_FILE: "app.py",
        REQUIREMENTS_FILE: "requirements.txt",
        USER_UPLOAD: false,
        MAIN_FILE: "index.js",
        JARFILE: "jar.jar",
        SERVER_JARFILE: "server.jar",
        VANILLA_VERSION: "latest"
    },

    SERVER_LIMITS: {
        memory: 512,
        swap: 0,
        disk: 1024,
        io: 500,
        cpu: 100
    },

    SERVER_FEATURE_LIMITS: {
        databases: 1,
        backups: 0
    },

    SERVER_ALLOCATION_DEFAULT: 1,

    SHOP_BUTTONS: [
        {
            label: 'Python Server',
            eggId: 18,
            style: 'Primary',
            dockerImage: 'python:3.9',
            startup: 'if [[ -d .git ]] && [[ "{{AUTO_UPDATE}}" == "1" ]]; then git pull; fi; if [[ ! -z "{{PY_PACKAGES}}" ]]; then pip install -U --prefix .local {{PY_PACKAGES}}; fi; if [[ -f /home/container/${REQUIREMENTS_FILE} ]]; then pip install -U --prefix .local -r ${REQUIREMENTS_FILE}; fi; /usr/local/bin/python /home/container/{{PY_FILE}}'
        },
        {
            label: 'Node.js Server',
            eggId: 19,
            style: 'Primary',
            dockerImage: 'ghcr.io/parkervcp/yolks:nodejs_21',
            startup: 'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; if [[ "${MAIN_FILE}" == "*.js" ]]; then /usr/local/bin/node "/home/container/${MAIN_FILE}" ${NODE_ARGS}; else /usr/local/bin/ts-node --esm "/home/container/${MAIN_FILE}" ${NODE_ARGS}; fi'
        },
        {
            label: 'Java Server',
            eggId: 16,
            style: 'Primary',
            dockerImage: 'openjdk:17',
            startup: 'java -Dterminal.jline=false -Dterminal.ansi=true -jar {{JARFILE}}'
        },
        {
            label: 'Test',
            eggId: 14,
            style: 'Primary',
            dockerImage: 'openjdk:17',
            startup: 'java -jar jar.jar'
        }
    ]
};
