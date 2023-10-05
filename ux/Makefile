include .env

.PHONY: all

build:
	docker build -t wingman .
	# docker build -t carverlab/cloud:wingman .
	# docker build -t ${DOCKER_USER}/wingman:${DOCKER_TAG} .

run:
	export $(cat .env | xargs)
	docker stop wingman || true && docker rm wingman || true
	docker run --name wingman --rm -e OPENAI_API_KEY=${OPENAI_API_KEY} -p 3000:3000 wingman

logs:
	docker logs -f wingman

push:
	docker tag wingman:latest ${DOCKER_USER}/wingman:${DOCKER_TAG}
	docker push ${DOCKER_USER}/wingman:${DOCKER_TAG}