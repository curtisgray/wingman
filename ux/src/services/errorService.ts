import { ErrorMessage } from "@/types/error";
import { useMemo } from "react";
import { t } from "@/utils/app/i18n";

const useErrorService = () => {

    return {
        getModelsError: useMemo(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            () => (error: any) => {
                return !error
                    ? null
                    : ({
                          title: t("Error fetching models."),
                          code: error.status || "unknown",
                          messageLines: error.statusText
                              ? [error.statusText]
                              : [
                                    t(
                                        "Make sure you are connected to the Internet, and check the 'Choose AI model' in the lower sidebar."
                                    ),
                                    t(
                                        "If you have already done this, system servers be experiencing issues."
                                    ),
                                ],
                      } as ErrorMessage);
            },
            [t]
        ),
    };
};

export default useErrorService;
