function(wingman_build_executable source)
    get_filename_component(TEST_TARGET ${source} NAME_WLE)
    add_executable(${TEST_TARGET} ${source})
    install(TARGETS ${TEST_TARGET} RUNTIME)
    target_link_libraries(${TEST_TARGET} PRIVATE ${${DOWNLOAD_TARGET}_link_libraries})
endfunction()

function(wingman_test_executable name source)
    get_filename_component(TEST_TARGET ${source} NAME_WLE)
    add_test(NAME ${name} COMMAND $<TARGET_FILE:${TEST_TARGET}> ${ARGN})
endfunction()

function(wingman_build_and_test_executable source)
    get_filename_component(TEST_TARGET ${source} NAME_WLE)
    add_executable(${TEST_TARGET} ${source})
    set_property(TARGET ${TEST_TARGET} PROPERTY CXX_STANDARD 20)
    install(TARGETS ${TEST_TARGET} RUNTIME)
    target_link_libraries(${TEST_TARGET} PRIVATE ${TEST_LINK_LIBRARIES})
    add_test(NAME ${TEST_TARGET} COMMAND $<TARGET_FILE:${TEST_TARGET}>)
endfunction()

find_package(GTest CONFIG REQUIRED)

# enable testing
enable_testing()

set(TEST_LINK_LIBRARIES ${${DOWNLOAD_TARGET}_link_libraries} GTest::gtest_main GTest::gmock_main)

# run `wingman_build_and_test_executable` for each source file
file(GLOB tests RELATIVE ${CMAKE_CURRENT_SOURCE_DIR} *.cpp)
foreach(test ${tests})
	wingman_build_and_test_executable(${test})
endforeach()
# wingman_build_and_test_executable(orm-wingman.cpp)
# wingman_build_executable(orm-download_set.cpp)
# wingman_test_executable (test-tokenizer-0-llama test-tokenizer-0-llama.cpp ${CMAKE_CURRENT_SOURCE_DIR}/../models/ggml-vocab-llama.gguf)
