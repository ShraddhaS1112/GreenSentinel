# Lambda container with GDAL/rasterio for satellite image processing
FROM public.ecr.aws/lambda/python:3.11

# Install system dependencies for GDAL
RUN yum install -y \
    gcc \
    gcc-c++ \
    make \
    && yum clean all

# Install Python packages
RUN pip install --no-cache-dir \
    rasterio==1.3.9 \
    numpy==1.26.4 \
    requests==2.31.0 \
    boto3==1.34.0 \
    pystac-client==0.7.5

# Copy function code
COPY handler.py ${LAMBDA_TASK_ROOT}

# Set the CMD to handler
CMD [ "handler.lambda_handler" ]
