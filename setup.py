from setuptools import setup, find_packages

setup(
    name='spectre',
    version='0.1.0',
    description='Edge and Graph Analysis Toolkit',
    author='bohemian-miser',
    packages=find_packages(),
    install_requires=[
        'click',
    ],
    entry_points={
        'console_scripts': [
            'spectre=spectre.cli:cli',
        ],
    },
)
