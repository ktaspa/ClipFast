FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    fonts-dejavu-core \
    fonts-noto-color-emoji \
    fontconfig \
    curl \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -f -v

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Build the bgutil server for PO token generation.
# Full npm install (includes devDeps for tsc), compile TS, then prune dev deps.
RUN git clone --depth=1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider /tmp/bgutil-src \
    && mkdir -p /root/bgutil-ytdlp-pot-provider/server \
    && cp -r /tmp/bgutil-src/server/. /root/bgutil-ytdlp-pot-provider/server/ \
    && cd /root/bgutil-ytdlp-pot-provider/server \
    && npm install \
    && ./node_modules/.bin/tsc \
    && npm prune --omit=dev \
    && rm -rf /tmp/bgutil-src

# Fontconfig: add Noto Color Emoji as fallback for all fonts so libass renders emoji
RUN mkdir -p /etc/fonts/conf.d && printf '%s\n' \
    '<?xml version="1.0"?>' \
    '<!DOCTYPE fontconfig SYSTEM "fonts.dtd">' \
    '<fontconfig>' \
    '  <alias>' \
    '    <family>DejaVu Sans</family>' \
    '    <prefer><family>DejaVu Sans</family><family>Noto Color Emoji</family></prefer>' \
    '  </alias>' \
    '  <alias>' \
    '    <family>Helvetica</family>' \
    '    <prefer><family>Helvetica</family><family>Noto Color Emoji</family></prefer>' \
    '  </alias>' \
    '</fontconfig>' \
    > /etc/fonts/conf.d/99-noto-emoji-fallback.conf \
    && fc-cache -f

COPY . .

RUN mkdir -p media

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
