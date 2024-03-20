#include <cuda_runtime.h>
#include <iostream>

int main()
{
    int nDevices;
    cudaError_t cudaStatus = cudaGetDeviceCount(&nDevices);
    if (cudaStatus != cudaSuccess) {
        std::cerr << "cudaGetDeviceCount failed: " << cudaGetErrorString(cudaStatus) << std::endl;
        return 1; // Return an error code indicating failure
    }

    if (nDevices == 0) {
        std::cout << "No CUDA devices found." << std::endl;
        return 0; // Return successfully but indicate no devices found
    }

    std::cout << "[" << std::endl; // Start of JSON array
    for (int i = 0; i < nDevices; i++) {
        cudaDeviceProp prop;
        cudaStatus = cudaGetDeviceProperties(&prop, i);
        if (cudaStatus != cudaSuccess) {
            std::cerr << "cudaGetDeviceProperties failed for device " << i << ": " << cudaGetErrorString(cudaStatus) << std::endl;
            continue; // Skip this device and move to the next
        }

        // Start of JSON object for each device
        std::cout << "  {" << std::endl;
        std::cout << "    \"DeviceNumber\": " << i << "," << std::endl;
        std::cout << "    \"DeviceName\": \"" << prop.name << "\"," << std::endl;
        std::cout << "    \"TotalGlobalMem\": " << prop.totalGlobalMem << "," << std::endl;

        // End of JSON object for each device
        if (i < nDevices - 1) {
            std::cout << "  }," << std::endl;
        } else {
            std::cout << "  }" << std::endl;
        }
    }
    std::cout << "]" << std::endl; // End of JSON array
    return 0;
}
