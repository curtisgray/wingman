import { IconX } from "@tabler/icons-react";
import toast, { ToastBar, Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "react-query";
import Home from "./home";

function App()
{
    const queryClient = new QueryClient();

    return (
        <div>
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
                <Home />
            </QueryClientProvider>
        </div>
    );
}

export default App;
