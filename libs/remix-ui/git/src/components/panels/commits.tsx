import { checkout, ReadCommitResult } from "isomorphic-git";
import React from "react";
import { gitActionsContext } from "../../state/context";
import { gitPluginContext } from "../gitui";
import { CommitDetails } from "./commits/commitdetails";
import { CommitSummary } from "./commits/commitsummary";


export const Commits = () => {
    const context = React.useContext(gitPluginContext)
    const actions = React.useContext(gitActionsContext)

    const checkout = async (oid: string) => {
        try {
            //await ModalRef.current?.show();
            actions.checkout({ ref: oid })
            //Utils.log("yes");
        } catch (e) {
            //Utils.log("no");
        }
    };


    return (
        <>
            {context.commits && context.commits.length ?
                <div>

                    <div className="pt-1">
                        {context.commits && context.commits.map((commit, index) => {
                            return (

                                <CommitDetails key={index} checkout={checkout} commit={commit}></CommitDetails>

                            );
                        })}

                        <div
                            onClick={async () => await checkout("main")}
                            className="btn btn-primary btn-sm checkout-btn mt-2 d-none"
                            data-oid="main"
                        >
                            git checkout main
                        </div>
                    </div>
                </div>
                : <div className="text-muted">No commits</div>}
        </>
    )
}