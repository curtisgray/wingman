#include <cublas_v2.h>
#include <cuda_runtime.h>
#include <iostream>

int main()
{
    cublasHandle_t handle;
    cublasCreate(&handle);

    int n = 6;
    float alpha = 1.0f;

    float h_A[] = { 1.0f, 2.0f, 3.0f, 4.0f, 5.0f, 6.0f };
    float h_B[] = { 6.0f, 5.0f, 4.0f, 3.0f, 2.0f, 1.0f };
    float *d_A, *d_B;
    float result;

    // Allocate memory on the device
    cudaMalloc(&d_A, n * sizeof(float));
    cudaMalloc(&d_B, n * sizeof(float));

    // Copy vectors from host to device
    cudaMemcpy(d_A, h_A, n * sizeof(float), cudaMemcpyHostToDevice);
    cudaMemcpy(d_B, h_B, n * sizeof(float), cudaMemcpyHostToDevice);

    // Perform dot product
    cublasSdot(handle, n, d_A, 1, d_B, 1, &result);

    std::cout << "Dot product is " << result << std::endl;

    // Cleanup
    cudaFree(d_A);
    cudaFree(d_B);
    cublasDestroy(handle);

    return 0;
}
