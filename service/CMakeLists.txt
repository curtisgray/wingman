cmake_minimum_required(VERSION 3.21)

project(wingman C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# set home directory depending on platform
if (WIN32)
    set(HOME_DIR $ENV{USERPROFILE})
else()
    set(HOME_DIR $ENV{HOME})
endif()

# set destination directory depending on platform
if (DEFINED ENV{WINGMAN_DESTINATION_DIR})
    set(DESTINATION_DIR $ENV{WINGMAN_DESTINATION_DIR})
else()
    set(DESTINATION_DIR ${CMAKE_INSTALL_PREFIX})
endif()
message(STATUS "Wingman destination (install) directory: ${DESTINATION_DIR}")

if (TRUE)
    include(CTest)
    # enable testing
    enable_testing()
endif()

find_library(USOCKETS_LIBRARY uSockets REQUIRED)
find_path(UWEBSOCKETS_INCLUDE_DIRS "uwebsockets/App.h" REQUIRED)
find_package(ZLIB REQUIRED)
find_package(libuv CONFIG REQUIRED)
find_package(spdlog CONFIG REQUIRED)
find_package(CURL CONFIG REQUIRED)
find_package(fmt CONFIG REQUIRED)
find_package(unofficial-sqlite3 CONFIG REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)
find_package(argparse CONFIG REQUIRED)

add_subdirectory(vendors/llama.cpp)

include_directories(${CMAKE_CURRENT_SOURCE_DIR} ${UWEBSOCKETS_INCLUDE_DIRS})
if (WIN32)
    # adds precompiled headers, which makes life hard when you have to update include files
    # add_compile_options("/ZI")
endif()

set(TARGET wingman)

set(SHARED_HEADER_DIRS
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

list(APPEND SHARED_HEADER_DIRS ${CMAKE_CURRENT_SOURCE_DIR}/llama_cpp ${CMAKE_CURRENT_SOURCE_DIR}/common)
message(STATUS "Shared header directories: ${SHARED_HEADER_DIRS}")

set(${TARGET}_lib_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/libsrc/curl.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/libsrc/orm.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/libsrc/on_exit.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/libsrc/download.service.cpp
)

set(SHARED_target_link_libraries
    ZLIB::ZLIB
    ${USOCKETS_LIBRARY}
    $<IF:$<TARGET_EXISTS:libuv::uv_a>,libuv::uv_a,libuv::uv>
    spdlog::spdlog_header_only
    fmt::fmt
    CURL::libcurl
    unofficial::sqlite3::sqlite3
    nlohmann_json::nlohmann_json
    argparse::argparse
    ${CMAKE_THREAD_LIBS_INIT}
)

### Wingman Library
add_library(${TARGET}_lib OBJECT ${${TARGET}_lib_SOURCES})
target_include_directories(${TARGET}_lib PUBLIC ${SHARED_HEADER_DIRS})
set_property(TARGET ${TARGET}_lib PROPERTY CXX_STANDARD 20)

### Wingman
add_executable(${TARGET} wingman.cpp)
target_include_directories(${TARGET} PRIVATE ${SHARED_HEADER_DIRS})
set_property(TARGET ${TARGET} PROPERTY CXX_STANDARD 20)
install(TARGETS ${TARGET} RUNTIME DESTINATION ${DESTINATION_DIR})
target_compile_definitions(${TARGET} PRIVATE
    WINGMAN_VERBOSE=$<BOOL:${LLAMA_SERVER_VERBOSE}>
)
target_link_libraries(${TARGET} PRIVATE
    common llama
	$<TARGET_OBJECTS:${TARGET}_lib>
    ${SHARED_target_link_libraries}
    ${CMAKE_THREAD_LIBS_INIT})

if (WIN32)
    TARGET_LINK_LIBRARIES(${TARGET} PRIVATE ws2_32)
endif()
target_compile_features(${TARGET} PRIVATE cxx_std_11)
if(TARGET BUILD_INFO)
  add_dependencies(${TARGET} BUILD_INFO)
endif()

### Tests
add_subdirectory(tests)

### Tools
add_subdirectory(tools)
