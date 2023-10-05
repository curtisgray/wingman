cmake_minimum_required(VERSION 3.21)

project(wingman C CXX)

# set home directory depending on platform
if (WIN32)
    set(HOME_DIR $ENV{USERPROFILE})
else()
    set(HOME_DIR $ENV{HOME})
endif()

# set destination directory depending on platform
if (DEFINED ENV{WINGMAN_DESTINATION_DIR})
    set(DESTINATION_DIR $ENV{WINGMAN_DESTINATION_DIR})
endif()
message(STATUS "Wingman destination directory: ${DESTINATION_DIR}")

#find_package(unofficial-sqlite3 CONFIG REQUIRED)
find_package(SQLiteCpp CONFIG REQUIRED)
find_library(USOCKETS_LIBRARY uSockets REQUIRED)
find_package(ZLIB REQUIRED)
find_package(libuv CONFIG REQUIRED)
find_package(spdlog CONFIG REQUIRED)
find_path(UWEBSOCKETS_INCLUDE_DIRS "uwebsockets/App.h" REQUIRED)
find_package(CURL CONFIG REQUIRED)
add_subdirectory(vendors/llama.cpp)

include_directories(${CMAKE_CURRENT_SOURCE_DIR} ${UWEBSOCKETS_INCLUDE_DIRS})
if (WIN32)
    # adds precompiled headers, which makes life hard when you have to update include files
    # add_compile_options("/ZI")
endif()

set(TARGET wingman)
file(GLOB SHARED_SOURCES
    on_exit.cpp
)

file(GLOB SHARED_HEADERS
    orm.hpp
    on_exit.h
    json.hpp
    httplib.h
)

list(APPEND SHARED_HEADERS ${CMAKE_CURRENT_SOURCE_DIR}/llama_cpp ${CMAKE_CURRENT_SOURCE_DIR}/common)

### Llama.cpp

### Wingman
add_executable(${TARGET} wingman.cpp)
target_include_directories(${TARGET} PRIVATE ${SHARED_HEADERS})
set_property(TARGET ${TARGET} PROPERTY CXX_STANDARD 20)
install(TARGETS ${TARGET} RUNTIME DESTINATION ${DESTINATION_DIR})
target_compile_definitions(${TARGET} PRIVATE
    WINGMAN_VERBOSE=$<BOOL:${LLAMA_SERVER_VERBOSE}>
)
target_link_libraries(${TARGET} PRIVATE
    common llama
    ZLIB::ZLIB
    ${USOCKETS_LIBRARY}
#    unofficial::sqlite3::sqlite3
    $<IF:$<TARGET_EXISTS:libuv::uv_a>,libuv::uv_a,libuv::uv>
    ${CMAKE_THREAD_LIBS_INIT})

if (WIN32)
    TARGET_LINK_LIBRARIES(${TARGET} PRIVATE ws2_32)
endif()
target_compile_features(${TARGET} PRIVATE cxx_std_11)
if(TARGET BUILD_INFO)
  add_dependencies(${TARGET} BUILD_INFO)
endif()

### Download
set(DOWNLOAD_TARGET wingman.download)

file(GLOB DOWNLOAD_SOURCES
    wingman.launcher.cpp
)

# glob list of header files
file(GLOB DOWNLOAD_HEADERS
    download.server.hpp
)
add_executable(${DOWNLOAD_TARGET} ${DOWNLOAD_SOURCES} ${SHARED_SOURCES} )
target_include_directories(${DOWNLOAD_TARGET} PRIVATE ${DOWNLOAD_HEADERS} ${SHARED_HEADERS})
set_property(TARGET ${DOWNLOAD_TARGET} PROPERTY CXX_STANDARD 20)
install(TARGETS ${DOWNLOAD_TARGET} RUNTIME DESTINATION ${DESTINATION_DIR})
target_compile_definitions(${DOWNLOAD_TARGET} PRIVATE
    WINGMAN_VERBOSE=$<BOOL:${LLAMA_SERVER_VERBOSE}>
)
set(${DOWNLOAD_TARGET}_link_libraries
    common llama
    ZLIB::ZLIB
    ${USOCKETS_LIBRARY}
#    unofficial::sqlite3::sqlite3
    SQLiteCpp
    $<IF:$<TARGET_EXISTS:libuv::uv_a>,libuv::uv_a,libuv::uv>
    spdlog::spdlog_header_only
    CURL::libcurl
    ${CMAKE_THREAD_LIBS_INIT}
)

target_link_libraries(${DOWNLOAD_TARGET} PRIVATE ${${DOWNLOAD_TARGET}_link_libraries})

add_subdirectory(tests)
add_subdirectory(tools)

if(WIN32)
    TARGET_LINK_LIBRARIES(${DOWNLOAD_TARGET} PRIVATE ws2_32)
endif()

target_compile_features(${DOWNLOAD_TARGET} PRIVATE cxx_std_11)

if(TARGET BUILD_INFO)
    add_dependencies(${DOWNLOAD_TARGET} BUILD_INFO)
endif()
