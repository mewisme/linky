package openaix

import (
	"linky-api/src/internal/infra/aiconfig"
)

type Capability string

const (
	CapabilityChat      Capability = "chat"
	CapabilityEmbedding Capability = "embedding"
	CapabilityImage     Capability = "image"
	CapabilityTTS       Capability = "tts"
	CapabilitySTT       Capability = "stt"
	CapabilityWebSearch Capability = "web_search"
	CapabilityWebFetch  Capability = "web_fetch"
)

func (c Capability) Path() string {
	switch c {
	case CapabilityChat:
		return "/chat/completions"
	case CapabilityEmbedding:
		return "/embeddings"
	case CapabilityImage:
		return "/images/generations"
	case CapabilityTTS:
		return "/audio/speech"
	case CapabilitySTT:
		return "/audio/transcriptions"
	case CapabilityWebSearch:
		return "/responses"
	case CapabilityWebFetch:
		return "/responses"
	default:
		return ""
	}
}

func (c Capability) ModelsListPath() string {
	switch c {
	case CapabilityEmbedding:
		return "/models/embedding"
	case CapabilityImage:
		return "/models/image"
	case CapabilityTTS:
		return "/models/tts"
	case CapabilitySTT:
		return "/models/stt"
	case CapabilityWebSearch, CapabilityWebFetch:
		return "/models/web"
	default:
		return "/models"
	}
}

type ChatUseCase string

const (
	ChatUseCaseBroadcast     ChatUseCase = "broadcast"
	ChatUseCaseReportSummary ChatUseCase = "report_summary"
)

func ModelForCapability(cap Capability) string {
	e := aiconfig.EffectiveConfig()
	switch cap {
	case CapabilityEmbedding:
		return e.EmbeddingModel
	case CapabilityImage:
		return e.ImageModel
	case CapabilityTTS:
		return e.TTSModel
	case CapabilitySTT:
		return e.STTModel
	case CapabilityWebSearch:
		return e.WebSearchModel
	case CapabilityWebFetch:
		return e.WebFetchModel
	default:
		return ""
	}
}

func ChatModel(useCase ChatUseCase) string {
	e := aiconfig.EffectiveConfig()
	switch useCase {
	case ChatUseCaseBroadcast:
		return e.ChatBroadcast
	case ChatUseCaseReportSummary:
		return e.ChatReportSummary
	default:
		return ""
	}
}

func EmbeddingModel() string {
	return ModelForCapability(CapabilityEmbedding)
}

func BroadcastModel() string {
	return ChatModel(ChatUseCaseBroadcast)
}

func ReportSummaryModel() string {
	return ChatModel(ChatUseCaseReportSummary)
}
