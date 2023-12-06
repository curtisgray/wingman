import React, { ReactNode, useContext } from "react";
import WingmanContext from "@/pages/api/home/wingman.context";

const WingmanStatus = ({title = "Wingman", showHardware = false, className = "" }) =>
{
    const {
        state: { 
            status: connectionStatus,
            isOnline,
            system,
        },
    } = useContext(WingmanContext);

    const renderOfflineHeader = (): ReactNode =>
    {
        return (
            <>
                <p>{title} <span title="Wingman is offline">{connectionStatus}</span></p>
            </>
        );
    };

    const renderOnlineHeader = (): ReactNode =>
    {
        return (
            <>
                <p>{title} <span title="Wingman is online">{connectionStatus}</span>
                    {showHardware &&
                    <span>{system.gpu_name}<span title="Wingman is online"> {system.cuda_str}</span></span>
                    }
                </p>
            </>);
    };

    const renderHeader = (): ReactNode =>
    {
        if (isOnline) {
            return renderOnlineHeader();
        } else {
            return renderOfflineHeader();
        }
    };

    return (
        <div className={`${className} text-center`}>
            {renderHeader()}
        </div>
    );
};

export default WingmanStatus;