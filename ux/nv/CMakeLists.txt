cmake_minimum_required(VERSION 3.8 FATAL_ERROR)
project(cublas_projects LANGUAGES CUDA CXX)

# Set the policy to silence the warning and explicitly specify CUDA architectures
cmake_policy(SET CMP0104 NEW)
set(CMAKE_CUDA_ARCHITECTURES OFF) # Example: Target Turing and Ampere

# Specify the CUDA compiler to use nvcc
set(CMAKE_CUDA_COMPILER nvcc)

# Find CUDA
find_package(CUDA REQUIRED)

# Include the CUDA directories
include_directories(${CUDA_INCLUDE_DIRS})

# Find all .cpp files starting with "cublas_"
file(GLOB CUBLAS_SOURCES "cublas_*.cpp")

# Ensure that we treat CUDA .cpp files properly
set_source_files_properties(${CUBLAS_SOURCES} PROPERTIES LANGUAGE CUDA)

# Iterate over each source file and create an executable
foreach(SOURCE ${CUBLAS_SOURCES})
    # Extract the filename without the extension to use as the target name
    get_filename_component(TARGET_NAME ${SOURCE} NAME_WE)

    # Add an executable based on the source file
    add_executable(${TARGET_NAME} ${SOURCE})

    # Link against the CUDA libraries, including cuBLAS
    target_link_libraries(${TARGET_NAME} PRIVATE cublas)
endforeach()

# Optional: Set specific NVCC flags
# set(CMAKE_CUDA_FLAGS "${CMAKE_CUDA_FLAGS} -add-your-nvcc-flags-here")
set(CMAKE_CUDA_FLAGS "${CMAKE_CUDA_FLAGS} -lcublas")
