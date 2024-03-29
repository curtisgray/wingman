import "@/styles/globals.css";
import "@/styles/react-select.css";
import { IconX } from "@tabler/icons-react";
import { appWithTranslation } from "next-i18next";
import type { AppProps } from "next/app";
import { Inter } from "next/font/google";
import toast, { ToastBar, Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "react-query";

const inter = Inter({ subsets: ["latin"] });

function App({ Component, pageProps }: AppProps<{}>) {
    const queryClient = new QueryClient();

    return (
        <div className={inter.className}>
            {/* <Toaster /> */}
            <Toaster>
                {(t) => (
                    <ToastBar toast={t}>
                        {({ icon, message }) => (
                            <>
                                {icon}
                                {message}
                                {t.type !== 'loading' && (
                                    <button onClick={() => toast.dismiss(t.id)}><IconX size={20} /></button>
                                )}
                            </>
                        )}
                    </ToastBar>
                )}
            </Toaster>
            <QueryClientProvider client={queryClient}>
                <Component {...pageProps} />
            </QueryClientProvider>
        </div>
    );
}

export default appWithTranslation(App);
