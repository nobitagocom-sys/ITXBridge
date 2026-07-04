docker stop itxbridge
docker rm itxbridge
docker build -t itxbridge .
docker run -d --name itxbridge -p 20127:20127 --env-file .env -v itxbridge-data:/app/data itxbridge