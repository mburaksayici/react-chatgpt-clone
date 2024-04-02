npm run dev:front
docker    build -t chat-interface .
 docker run -p 0.0.0.0:5173:5173  -d   chat-interface
