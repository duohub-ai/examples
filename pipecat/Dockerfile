FROM python:3.12-bullseye-slim

RUN mkdir /app
RUN mkdir /app/assets
RUN mkdir /app/utils
COPY *.py /app/
COPY requirements.txt /app/
COPY assets/* /app/assets/
COPY utils/* /app/utils/

WORKDIR /app
RUN pip3 install -r requirements.txt

EXPOSE 7860

CMD ["python3", "server.py"]