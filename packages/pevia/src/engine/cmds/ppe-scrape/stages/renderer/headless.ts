import {  useScrapePipe } from "../../run.js";
import { StageAsyncHandler } from "../../../../../util/ppe.js";
import { ReturnTypeRendererStage } from "./index.js";

export const renderByHeadlessAsyncHandler:StageAsyncHandler<ReturnTypeRendererStage> = async () => {
        const {usePipeTools} = useScrapePipe();
        const {cli} = usePipeTools();

        const reason = `Fetching and extracting HTML through virtual browser is not yet implemented in beta version`;

        cli.text.icon(i=>i.debug).line(
            cx => cx.red.write(`"RENDERER_BY_HEADLESS_STAGE" `)+cx.yellow.write(reason)
        ).log();

        return {
            status: "failed",
            reason,
            error: new Error(reason),
            metadata:{
                explicitStageName: "RENDERER_BY_HEADLESS_STAGE"
            }
        }
};