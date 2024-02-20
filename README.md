![logo](./assets/images/wingman-logo.png)

Wingman is a private ChatGPT interface for your PC. It combines Meta's Llama and OpenAI's GPT AI's into one interface, allowing you to change to change models mid conversation, and give real-time feedback to the AI.

## Wingman: Advanced AI Integration for Your Desktop

Effortless AI Model Integration: Wingman provides a streamlined solution to bring advanced AI capabilities, specifically Meta’s Llama and OpenAI's GPT models, to your Windows or Mac environment. This integration bypasses the usual complexities of setup and configuration, making cutting-edge AI accessible without the need for extensive development tools or setup procedures.

Silk Tuning – Personalized AI Feedback Loop: At its core, Wingman employs an innovative feature called Silk Tuning. This mechanism enables users to rate AI responses in real-time, directly influencing the AI's learning process. The system then uses this feedback to generate a Learning Rate Adjustment (LoRA), which dynamically tailors the AI’s responses to align more closely with individual user preferences and interaction styles. This process of personalized adjustment occurs during periods of low activity on your PC, ensuring continuous improvement and customization of the AI experience.

Swift Switch – Dynamic Model Comparison: With Swift Switch, users gain the flexibility to switch between different AI models during a conversation. This feature is particularly useful for technical professionals and AI enthusiasts interested in observing and comparing the nuances of various AI models' responses. Whether it's transitioning from a high-capacity model like GPT-4 for in-depth, complex queries to a leaner model for efficiency, Swift Switch offers a practical tool for real-time performance evaluation and comparison.

Wingman is more than just an application; it's a gateway to a more accessible and tailored AI experience. By eliminating the barriers of complex AI integration and offering unique features for personalized and flexible interactions, Wingman stands as a valuable tool for those wanting to explore and utilize AI technologies with ease and efficiency.

### Wingman is under heavy development. Expect frequent updates.
## Progress Updates

- ✅ Add All GPT Models
- ✅ Duplicate existing conversations
- ✅ Add local Llama support (in progress)
- ✅ Download Llama models locally
- ⏳Desktop app
- ✉️ Silk Tuning
- ✅ Swift Switch
- ✉️ Extend conversation beyond original context

**Legend**:
✅ Completed, ⏳ In Progress, ✉️ Not Started

## Requirements for Hardware and OS

- Windows 10+ or Mac OS X
- 2016 or newer CPU
- 16GB+ RAM
- 2016 or newer GPU with at least 3GB of RAM
- GPU not required, but recommended
- 100GB free disk space (for AI models)
- 1GB free disk space (for app)


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
