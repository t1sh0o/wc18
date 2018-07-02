# /bin/sh

rsync -rc --progress ./ crackerjack:/var/www/html/wc18

ssh crackerjack "/var/www/html/wc18/node_modules/forever/bin/forever restart Wlan"