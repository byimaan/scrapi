import { FollowUseToolsCallback } from "../../../util/ppe.js";

export const scrapeSummaryFollowupCallback:FollowUseToolsCallback = ({getStages,cli}) => {
    const stages=getStages(), gap= (x=2)=>" ".repeat(x);
    cli.text.icon(i=>i.ai).line(
        cx=> cx.blue.write(`"SCRAPE_PIPE" summary:`)
    ).log();
    for(const stage of stages){
        const status = stage.state.status;
        if (status === 'success'){
            cli.text.icon(i=>gap(2)+i.success).line(
                cx=>cx.cyan.write(stage.name+" "+cx.underline.write(status)) 
            ).log();
        } else {
            cli.text.icon(i=>gap(2)+i.error).line(
                cx=>cx.cyan.write(stage.name+" "+cx.underline.write(status)) 
            ).log();
            const reason = stage.state.reason;
            cli.text.line(
                cx=>gap(3)+cx.yellow.write(cx.underline.write('reason:')+" "+reason)
            ).log()
        }
    }
};