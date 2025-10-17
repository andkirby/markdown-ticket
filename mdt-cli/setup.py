from setuptools import setup, find_packages

setup(
    name="mdt-cli",
    version="1.0.0",
    py_modules=[
        "mdt",
        "ticket_normalizer",
        "mcp_client", 
        "llm_processor",
        "output_formatter",
        "config"
    ],
    install_requires=[
        "guidance>=0.1.0",
        "click>=8.0.0",
        "colorama>=0.4.0",
        "pydantic>=2.0.0",
        "python-dotenv>=1.0.0",
        "openai>=1.0.0"
    ],
    entry_points={
        "console_scripts": [
            "mdt=mdt:main",
        ],
    },
)
