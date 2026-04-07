.PHONY: help install run setup

PYTHON ?= python3
PIP ?= pip3
WEB_DIR ?= web

help:
	@printf "Available targets:\n"
	@printf "  make install  Install Python and web dependencies\n"
	@printf "  make run      Start the web development server\n"
	@printf "  make setup    Install everything, then run the app\n"

install:
	$(PIP) install -r requirements.txt
	cd $(WEB_DIR) && npm install

run:
	cd $(WEB_DIR) && npm run dev

setup: install run
