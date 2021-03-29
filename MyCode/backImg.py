import shutil
import os
import codecs
#from bs4 import BeautifulSoup
import re
import base64
import random
import sys


def convertPdf2Html(filename, folderName):
	cmd = "pdf2htmlEX -f 1  --fit-width 1024 --bg-format jpg --embed-image 0 --dest-dir " + folderName + " " + filename
	os.system(cmd)
	files = os.listdir(folderName) # dir is your directory path

	number_files = len(files)
	
	return number_files


filename = sys.argv[1]
folderName = sys.argv[2]

try:
	os.mkdir(folderName)
except OSError:
	shutil.rmtree(folderName)
	os.mkdir(folderName)

convertPdf2Html(filename, folderName)

