import { ErrorMessage } from "@/types/error";
import { useTranslation } from "next-i18next";
import { useMemo } from "react";

const useErrorService = () => {
    const { t } = useTranslation("chat");

    return {
        getModelsError: useMemo(
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
