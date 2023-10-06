![logo](./assets/images/wingman-logo.png)

<h2 style="text-align: center;">Wingman is under heavy development. Expect frequent updates and breaking changes.</h2>

# Your Wingman

Wingman is an open source local native user experience for AI models. Wingman is designed from the ground up to be personalized, adaptive, and proactive.

Your Wingman runs locally, on your hardware. Wingman is designed to be tuned to your hardware, and will automatically self performance tune. But, manual tuning can extract the best possible performance. That, too, is on the roadmap. Soon, you’ll be able to share and rate configurations for specific hardware: from a modern laptop to a state of the art gamer rig.

Wing man is designed to grow with you, getting to know you through conversation. Do you have tools that allow you to get feedback on your Wingman responses. Your Wingman uses your feedback, in real time, to get to know you and adapt to you. Your Wingman is with you wherever you go. The roadmap for new features includes giving your Wingman the ability to fine-tune while you’re away.

# Progress Updates

- ✅ Add GPT-3.5 Turbo 16K
- ✅ Duplicate existing conversations
- ⏳ Add local Llama support (in progress)
- ⏳ Download Llama models locally (in progress)
- ✉️ Change AI model on the fly
- ✉️ Extend conversation beyond original context

**Legend**:
✅ Completed, ⏳ In Progress, ✉️ Not Started

## Installation

Note, an OpenAI API key is NOT needed, unless you want to run an OpenAI GPT-style model. Otherwise it is not needed. Wingman is designed to run without it.

Wingman will autodetect whether you have an OpenAI API key and make a GPT AI models available automatically.

### **Native Installers**

*Coming soon for Windows, Mac and Linux*

### **Build From Source**

See [Build Locally](#build-locally) for instructions on how to build Wingman locally.

```shell
cd [wingman root]
run
```

#### Prerequisites

None

### **Docker**

Build locally:

```shell
docker build -t wingman .
docker run -e OPENAI_API_KEY=xxxxxxxx -p 3000:3000 wingman
```

Pull from Docker Hub:

```
docker run -e OPENAI_API_KEY=xxxxxxxx -p 3000:3000 carverlab/public-cloud:wingman
```

### Prerequisites

- Docker (latest)

## Build Locally

**1. Clone Repo**

```bash
git clone https://github.com/curtisgray/wingman.git
```

**2. Build Front and Back Ends**

```bash
cd ux
npm i
cd ../service
mkdir -p build
cd build
cmake ..
cmake --build .
cd ../..
```

**3. Provide OpenAI API Key**

Create a .env.local file in the root of the repo with your OpenAI API Key:

```bash
OPENAI_API_KEY=YOUR_KEY
```

> You can set `OPENAI_API_HOST` where access to the official OpenAI host is restricted or unavailable, allowing users to configure an alternative host for their specific needs.

> Additionally, if you have multiple OpenAI Organizations, you can set `OPENAI_ORGANIZATION` to specify one.

**4. Run App**

```bash
run
```

**5. Use It**

Open a browser and navigate to: <http://localhost:3000>.

You should be able to start chatting.

## Configuration

When deploying the application, the following environment variables can be set:

| Environment Variable              | Default value                  | Description                                                                                                                               |
| --------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| OPENAI_API_KEY                    |                                | The default API key used for authentication with OpenAI                                                                                   |
| OPENAI_API_HOST                   | `https://api.openai.com`       | The base url, for Azure use `https://<endpoint>.openai.azure.com`                                                                         |
| OPENAI_API_TYPE                   | `openai`                       | The API type, options are `openai` or `azure`                                                                                             |
| OPENAI_API_VERSION                | `2023-03-15-preview`           | Only applicable for Azure OpenAI                                                                                                          |
| AZURE_DEPLOYMENT_ID               |                                | Needed when Azure OpenAI, Ref [Azure OpenAI API](https://learn.microsoft.com/zh-cn/azure/cognitive-services/openai/reference#completions) |
| OPENAI_ORGANIZATION               |                                | Your OpenAI organization ID                                                                                                               |
| DEFAULT_MODEL                     | `gpt-3.5-turbo`                | The default model to use on new conversations, for Azure use `gpt-35-turbo`                                                               |
| NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT | [see here](utils/app/const.ts) | The default system prompt to use on new conversations                                                                                     |
| NEXT_PUBLIC_DEFAULT_TEMPERATURE   | 1                              | The default temperature to use on new conversations                                                                                       |
| GOOGLE_API_KEY                    |                                | See [Custom Search JSON API documentation][GCSE]                                                                                          |
| GOOGLE_CSE_ID                     |                                | See [Custom Search JSON API documentation][GCSE]                                                                                          |

If you do not provide an OpenAI API key with `OPENAI_API_KEY`, users will have to provide their own key.

If you don't have an OpenAI API key, you can get one [here](https://platform.openai.com/account/api-keys).

## Contact

If you have any questions reach out to Electric Curtis on [Twitter](https://twitter.com/electric_curtis).

## Acknowledgements

- UX is forked and modified from https://github.com/mckaywrigley/chatbot-ui
- Service uses the llama.cpp library at https://github.com/ggerganov/llama.cpp
