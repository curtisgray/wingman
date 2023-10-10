function(wingman_build_and_test_executable source)
    get_filename_component(TEST_TARGET ${source} NAME_WLE)
    add_executable(${TEST_TARGET} ${source})
    target_include_directories(${TEST_TARGET} PRIVATE ${SHARED_HEADER_DIRS})
    set_property(TARGET ${TEST_TARGET} PROPERTY CXX_STANDARD 20)
    install(TARGETS ${TEST_TARGET} RUNTIME)
    target_link_libraries(${TEST_TARGET} PRIVATE ${TEST_LINK_LIBRARIES})
    add_test(NAME ${TEST_TARGET} COMMAND $<TARGET_FILE:${TEST_TARGET}>)
endfunction()

find_package(GTest CONFIG REQUIRED)

# enable testing
enable_testing()

set(TEST_LINK_LIBRARIES $<TARGET_OBJECTS:${TARGET}_lib> ${SHARED_target_link_libraries} GTest::gtest_main GTest::gmock_main)

# run `wingman_build_and_test_executable` for each source file
file(GLOB tests RELATIVE ${CMAKE_CURRENT_SOURCE_DIR} *.cpp)
foreach(test ${tests})
	wingman_build_and_test_executable(${test})
endforeach()
