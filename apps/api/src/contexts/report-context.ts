import type { CollectReportContextParams, ReportContextData } from "@/domains/reports/types/report-context.types.js";

import { collectReportContext as collectReportContextImpl } from "@/domains/reports/service/report-context.service.js";
import { getVideoChatContext } from "@/domains/video-chat/socket/video-chat.socket.js";

export async function collectReportContext(params: CollectReportContextParams): Promise<ReportContextData> {
  return await collectReportContextImpl(params, { getVideoChatContext });
}

